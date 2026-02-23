import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';

// Disable Autofill to prevent "Request Autofill.enable failed" errors
app.commandLine.appendSwitch('disable-features', 'Autofill,AutofillServerCommunication,AutofillAddressEnabled,PasswordManager,AutofillCreditCardEnabled');
app.commandLine.appendSwitch('disable-save-password-bubble');

// Suppress extraneous console logs
app.commandLine.appendSwitch('log-level', '3'); // Fatal only

// Filter useless DevTools errors from stderr/stdout
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    const str = chunk.toString();
    if (str.includes('Request Autofill.enable failed') || str.includes('Request Autofill.setAddresses failed')) {
        return true;
    }
    return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
};

const originalStdoutWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
    const str = chunk.toString();
    if (str.includes('Request Autofill.enable failed') || str.includes('Request Autofill.setAddresses failed')) {
        return true;
    }
    return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
};

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import cron from 'node-cron'; // Import node-cron
import smsService from './smsService.js'; // Import SMS Service
import PDFDocument from 'pdfkit'; // Import PDFKit
import ExcelJS from 'exceljs'; // Import exceljs for exports instead of missing xlsx

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (process.platform === 'win32') {
//     // eslint-disable-next-line @typescript-eslint/no-var-requires
//     if (require('electron-squirrel-startup')) app.quit();
// }

const fs = require('fs');

// Ensure data directory exists
// Ensure data directory exists in User Data folder (Roaming/AppData)
const dataDir = join(app.getPath('userData'), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const smsConfigPath = join(dataDir, 'sms_config.json');
const dbPath = join(dataDir, 'school.db');

// --- Database Migration / Initialization ---
try {
    if (!fs.existsSync(dbPath)) {
        console.log("Database not found in UserData, checking for existing data to migrate...");

        // 1. Check for database in the source/resources folder (packaged app)
        // In electron-builder, extraResources or files can be unpacked. 
        // Or checks if we are running from source.
        const possibleOldPaths = [
            join(__dirname, '../data/school.db'), // Dev environment
            join(process.resourcesPath, 'data/school.db'), // Packaged resource
            join(app.getAppPath(), '../data/school.db') // Another variation
        ];

        let found = false;
        for (const oldPath of possibleOldPaths) {
            if (fs.existsSync(oldPath)) {
                console.log(`Migrating database from: ${oldPath}`);
                fs.copyFileSync(oldPath, dbPath);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log("No existing database found. A new one will be created.");
        }
    }
} catch (e) {
    console.error("Migration error:", e);
}
const db = new Database(dbPath);

// Initialize Database
function initDB() {
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Students Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS students (
            regNum TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            dob TEXT,
            phone TEXT,
            email TEXT,
            class TEXT NOT NULL,
            guardian TEXT,
            guardianPhone TEXT,
            status TEXT CHECK(status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Operators Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'operator',
            status TEXT DEFAULT 'active',
            lastActive TEXT DEFAULT 'Never',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Payments Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            regNum TEXT NOT NULL,
            amount REAL NOT NULL,
            month TEXT NOT NULL,
            date TEXT NOT NULL,
            method TEXT NOT NULL,
            type TEXT NOT NULL,
            class TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(regNum) REFERENCES students(regNum)
        )
    `);

    // Migration for existing databases without 'class' column in payments
    try {
        db.exec("ALTER TABLE payments ADD COLUMN class TEXT");
    } catch (e) {
        // Ignore error if column already exists
    }

    // Migration for students table columns (guardian, guardianPhone, avatar, gender, enrollments)
    // We try to add them one by one. If they exist, it throws, we ignore.
    const studentCols = ['guardian', 'guardianPhone', 'avatar', 'email', 'dob', 'phone', 'gender', 'enrollments'];
    studentCols.forEach(col => {
        try {
            db.exec(`ALTER TABLE students ADD COLUMN ${col} TEXT`);
        } catch (e) {
            // Ignore
        }
    });

    // Class Categories Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS class_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            fee REAL NOT NULL,
            duration TEXT DEFAULT '3 months',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for class_categories duration
    try {
        db.exec("ALTER TABLE class_categories ADD COLUMN duration TEXT DEFAULT '3 months'");
    } catch (e) {
        // Ignore error if column already exists
    }

    // SMS Settings Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sms_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT DEFAULT 'mock',
            apiKey TEXT,
            senderId TEXT,
            adminPhone TEXT,
            reminderDate INTEGER DEFAULT 7,
            reminderTime TEXT DEFAULT '09:00',
            enabled INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for sms_settings adminPhone, reminderDate, reminderTime (for existing databases)
    try {
        db.exec("ALTER TABLE sms_settings ADD COLUMN adminPhone TEXT");
    } catch (e) { }
    try {
        db.exec("ALTER TABLE sms_settings ADD COLUMN reminderDate INTEGER DEFAULT 7");
    } catch (e) { }
    try {
        db.exec("ALTER TABLE sms_settings ADD COLUMN reminderTime TEXT DEFAULT '09:00'");
    } catch (e) { }

    // Initialize default SMS settings if empty
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM sms_settings').get().count;
    if (settingsCount === 0) {
        db.prepare("INSERT INTO sms_settings (provider, apiKey, senderId, adminPhone) VALUES ('DefaultGateway', '', 'SLDJ', '')").run();
    }

    // SMS Logs Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sms_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Exam Results Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS exam_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            regNum TEXT NOT NULL,
            class_name TEXT NOT NULL,
            result TEXT CHECK(result IN ('Pass', 'Fail', 'None')) DEFAULT 'None',
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(regNum) REFERENCES students(regNum)
        )
    `);

    // Finance Records Table (Earnings & Expenses)
    db.exec(`
        CREATE TABLE IF NOT EXISTS finance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            reference TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// --- PDF Generation Helper ---
function generateReceiptPDF(data, logoPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A5', margin: 40 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));

            // Header - Logo
            if (fs.existsSync(logoPath)) {
                const logoWidth = 40;
                const logoX = (doc.page.width - logoWidth) / 2;
                doc.image(logoPath, logoX, 30, { width: logoWidth });
            }

            // Header - Company Name
            doc.font('Helvetica-Bold')
                .fontSize(18)
                .fillColor('#FF0000') // Brand Red
                .text('SL Dream Japan', 0, 80, { align: 'center', width: doc.page.width });

            doc.fontSize(10)
                .fillColor('#666666')
                .text('Institute of Japanese Language', 0, 105, { align: 'center', width: doc.page.width });

            doc.moveDown();

            // Receipt Box
            const startY = 140; // Adjusted starting Y to account for logo and text
            doc.rect(40, startY, 340, 160).stroke('#eeeeee');

            let currentY = startY + 20;
            const drawRow = (label, value, isBold = false) => {
                doc.fontSize(10).fillColor('#888888').text(label, 60, currentY);
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                    .fillColor('#333333')
                    .text(value, 160, currentY);
                currentY += 25;
            };

            drawRow('Receipt No:', data.receiptNo, true);
            drawRow('Date:', data.date);
            drawRow('Student Name:', data.studentName);
            drawRow('Course/Class:', data.course);

            // Amount Highlight
            doc.rect(40, currentY + 10, 340, 40).fill('#f8fafc');
            doc.fontSize(12).fillColor('#666666').text('Total Paid', 60, currentY + 22);
            doc.fontSize(16).fillColor('#0d9488').font('Helvetica-Bold').text(`LKR ${data.amount.toLocaleString()}`, 160, currentY + 18);

            // Footer
            const footerY = currentY + 100;
            doc.fontSize(8)
                .fillColor('#aaaaaa')
                .text('This is a computer generated receipt.', 0, footerY, { align: 'center', width: doc.page.width });
            doc.text('Thank you for learning with SL Dream Japan.', 0, footerY + 12, { align: 'center', width: doc.page.width });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

// --- SMS Config Persistence Helpers ---

function loadSmsConfig() {
    try {
        if (fs.existsSync(smsConfigPath)) {
            const data = fs.readFileSync(smsConfigPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to load SMS config from JSON:", e);
    }

    // Fallback: Try to migrate from DB if JSON doesn't exist
    try {
        const row = db.prepare('SELECT * FROM sms_settings LIMIT 1').get();
        if (row) {
            console.log("Migrating SMS settings from DB to JSON...");
            saveSmsConfig(row);
            return row;
        }
    } catch (e) {
        // DB might not have the table yet or error
    }

    // Default Config
    return {
        provider: 'DefaultGateway',
        apiKey: '',
        senderId: 'SLDJ',
        adminPhone: '',
        reminderDate: 7,
        reminderTime: '09:00',
        enabled: true
    };
}

function saveSmsConfig(config) {
    try {
        fs.writeFileSync(smsConfigPath, JSON.stringify(config, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error("Failed to save SMS config to JSON:", e);
        return false;
    }
}

initDB();

let mainWindow = null;
let otpStore = { code: null, expires: 0 };

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Don't show until ready to prevent resizing glitch
        webPreferences: {
            preload: join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false // Required for ESM preload in some environments
        },
    });

    // Remove the menu bar completely
    mainWindow.setMenu(null);

    // Maximize immediately while hidden to ensure layout is calculated at full size
    mainWindow.maximize();

    // Smooth Startup: Show only when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // In development, load from the Vite dev server
    if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools(); // Open DevTools to help debugging

        mainWindow.on('close', () => {
            mainWindow.webContents.closeDevTools();
        });
    } else {
        // In production, load the built index.html
        mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }
};

app.whenReady().then(() => {
    createWindow();

    // Toggle DevTools with F12 in production
    globalShortcut.register('F12', () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // --- IPC Handlers for Students ---
    ipcMain.handle('get-students', () => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dayOfMonth = now.getDate();
        const isLate = dayOfMonth > 10;

        const students = db.prepare('SELECT * FROM students ORDER BY created_at DESC').all();
        // Get this month's payments with class info
        const payments = db.prepare('SELECT regNum, class FROM payments WHERE month = ?').all(currentMonth);

        // Create map of regNum -> Set of paid classes
        const paymentMap = {};
        payments.forEach(p => {
            if (!paymentMap[p.regNum]) paymentMap[p.regNum] = new Set();
            if (p.class) paymentMap[p.regNum].add(p.class);
        });

        return students.map(s => {
            let classes = [];
            try {
                // Try parsing as JSON array
                classes = JSON.parse(s.class);
            } catch (e) {
                // If not JSON, it's a single string legacy value
                classes = [s.class];
            }
            if (!Array.isArray(classes)) classes = [s.class]; // Fallback

            // Calculate status for each class
            const classStatuses = classes.map(clsName => {
                // Logic: 
                // Paid if in paymentMap
                // Overdue if not paid AND isLate
                // Pending otherwise
                const isPaid = paymentMap[s.regNum]?.has(clsName);
                let status = 'pending';
                if (isPaid) status = 'paid';
                else if (isLate) status = 'overdue';

                return { className: clsName, status };
            });

            // Aggregate status for backward compatibility (e.g. for simple badges or sorting)
            // If ANY are overdue -> overdue
            // Else if ANY are pending -> pending
            // Else -> paid
            let aggStatus = 'paid';
            if (classStatuses.some(c => c.status === 'overdue')) aggStatus = 'overdue';
            else if (classStatuses.some(c => c.status === 'pending')) aggStatus = 'pending';

            return {
                ...s,
                class: classes, // Return array now (frontend must handle)
                classStatuses, // Detailed info
                status: aggStatus // Aggregate status
            };
        });
    });

    ipcMain.handle('get-student', (event, regNum) => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dayOfMonth = now.getDate();
        const isLate = dayOfMonth > 10;

        const student = db.prepare('SELECT * FROM students WHERE regNum = ?').get(regNum);
        if (!student) return null;

        const payments = db.prepare('SELECT class FROM payments WHERE regNum = ? AND month = ?').all(regNum, currentMonth);
        const paidClasses = new Set(payments.map(p => p.class));

        let classes = [];
        try {
            classes = JSON.parse(student.class);
        } catch (e) {
            classes = [student.class];
        }
        if (!Array.isArray(classes)) classes = [student.class];

        const classStatuses = classes.map(clsName => {
            const isPaid = paidClasses.has(clsName);
            let status = 'pending';
            if (isPaid) status = 'paid';
            else if (isLate) status = 'overdue';
            return { className: clsName, status };
        });

        let aggStatus = 'paid';
        if (classStatuses.some(c => c.status === 'overdue')) aggStatus = 'overdue';
        else if (classStatuses.some(c => c.status === 'pending')) aggStatus = 'pending';

        return {
            ...student,
            class: classes,
            classStatuses,
            status: aggStatus
        };
    });

    ipcMain.handle('add-student', (event, student) => {
        try {
            console.log("Adding Student Payload:", student);

            // Force check for gender column presence
            try {
                db.exec("ALTER TABLE students ADD COLUMN gender TEXT");
                console.log("Added missing gender column via handler");
            } catch (e) {
                // Column likely exists, ignore error
            }

            // Ensure class is stored as JSON string if array
            const studentToSave = { ...student };
            if (Array.isArray(studentToSave.class)) {
                studentToSave.class = JSON.stringify(studentToSave.class);
            }

            const stmt = db.prepare(`
            INSERT INTO students (regNum, name, dob, phone, email, class, enrollments, guardian, guardianPhone, status, avatar, gender)
            VALUES (@regNum, @name, @dob, @phone, @email, @class, @enrollments, @guardian, @guardianPhone, @status, @avatar, @gender)
        `);
            stmt.run({ ...studentToSave, enrollments: studentToSave.enrollments || null });

            // --- SMS TRIGGER: Registration Welcome ---
            try {
                const settings = loadSmsConfig();
                if (settings && settings.enabled) {
                    const message = `SL Dream Japan වෙත ලියාපදිංචි වූ ඔබට ස්තුතියි. ඔබගේ අධ්‍යාපනික හා වෘත්තීය අනාගතයට සාර්ථකත්වය ප්‍රාර්ථනා කරමු.`;
                    if (studentToSave.phone) {
                        smsService.sendSMS(studentToSave.phone, message, settings)
                            .then(res => {
                                console.log("Registration SMS result:", res);
                                db.prepare('INSERT INTO sms_logs (recipient, message, status) VALUES (?, ?, ?)').run(
                                    studentToSave.phone, message, res.success ? 'sent' : 'failed'
                                );
                            })
                            .catch(err => console.error("SMS Send Error:", err));
                    }
                }
            } catch (smsErr) {
                console.error("Failed to trigger registration SMS:", smsErr);
            }

            return studentToSave;
        } catch (err) {
            console.error("Failed to add student:", err);
            throw err;
        }
    });



    ipcMain.handle('update-student', (event, student) => {
        const studentToSave = { ...student };
        if (Array.isArray(studentToSave.class)) {
            studentToSave.class = JSON.stringify(studentToSave.class);
        }

        const stmt = db.prepare(`
          UPDATE students SET 
            name = @name, 
            dob = @dob, 
            phone = @phone, 
            email = @email, 
            class = @class, 
            enrollments = @enrollments,
            guardian = @guardian, 
            guardianPhone = @guardianPhone, 
            status = @status, 
            avatar = @avatar,
            gender = @gender,
            updated_at = CURRENT_TIMESTAMP
          WHERE regNum = @regNum
      `);
        stmt.run({ ...studentToSave, enrollments: studentToSave.enrollments || null });

        return studentToSave;
    });

    ipcMain.handle('delete-student', (event, regNum) => {
        const deleteTransaction = db.transaction((id) => {
            db.prepare('DELETE FROM payments WHERE regNum = ?').run(id);
            db.prepare('DELETE FROM students WHERE regNum = ?').run(id);
        });
        deleteTransaction(regNum);
        return regNum;
    });

    // --- IPC Handlers for Operators ---
    ipcMain.handle('get-operators', () => {
        // Exclude password from result
        const stmt = db.prepare('SELECT id, name, email, role, status, lastActive, created_at FROM operators ORDER BY created_at DESC');
        return stmt.all();
    });

    ipcMain.handle('add-operator', (event, operator) => {
        const stmt = db.prepare(`
            INSERT INTO operators (name, email, password, role, status, lastActive)
            VALUES (@name, @email, @password, @role, @status, @lastActive)
        `);
        const info = stmt.run(operator);
        return { ...operator, id: info.lastInsertRowid };
    });

    ipcMain.handle('delete-operator', (event, id) => {
        const stmt = db.prepare('DELETE FROM operators WHERE id = ?');
        stmt.run(id);
        return id;
    });

    ipcMain.handle('toggle-operator-status', (event, { id, status }) => {
        const stmt = db.prepare('UPDATE operators SET status = ? WHERE id = ?');
        stmt.run(status, id);
        return { id, status };
    });

    // Auth Check (Login)
    ipcMain.handle('verify-operator', (event, { email, password }) => {
        // In real app, hash password. Here cleartext as per mock style request or basic demo.
        const stmt = db.prepare('SELECT * FROM operators WHERE (email = ? OR role = ?) AND password = ?');
        // NOTE: Allowing login by 'role' name (e.g. 'operator') is weird but matches the simple UI flow.
        // We initially check email for specificity.
        // But the login UI sends 'role' as identifier right now. 
        // Let's assume we pass { email: ... } if we have it, or we rely on some other ID.
        // Wait, the Login UI sends `login({ role: 'operator', password: '...' })`.
        // So we really only check role? That means ALL operators share the same password?
        // NO, the user requested "new operator login process add password". 
        // Best approach: If role is 'operator', we need an EMAIL or USERNAME input.
        // I added Email input plan.

        // For now, let's keep it flexible:
        const user = stmt.get(email, email, password);
        return user || null;
    });

    // --- IPC Handlers for Payments ---
    ipcMain.handle('add-payment', (event, payment) => {
        try {
            console.log("Processing payment:", payment);
            const insert = db.prepare(`
                INSERT INTO payments (regNum, amount, month, date, method, type, class)
                VALUES (@regNum, @amount, @month, @date, @method, @type, @class)
            `);
            const info = insert.run(payment);

            // We do NOT update student table status anymore because it's calculated dynamically.
            // But we might want to update updated_at just in case.
            const updateTime = db.prepare("UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE regNum = ?");
            updateTime.run(payment.regNum);

            console.log("Payment success, ID:", info.lastInsertRowid);
            return { ...payment, id: info.lastInsertRowid };
        } catch (err) {
            console.error("Error in add-payment:", err);
            throw err;
        }
    });

    ipcMain.handle('get-student-payments', (event, regNum) => {
        const stmt = db.prepare('SELECT * FROM payments WHERE regNum = ? ORDER BY date DESC');
        return stmt.all(regNum);
    });

    // --- IPC Handlers for Dashboard ---
    ipcMain.handle('check-db-schema', () => {
        const info = db.pragma('table_info(students)');
        console.log('Schema Check:', info);
        return info;
    });

    ipcMain.handle('get-dashboard-stats', () => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        // Active Students (Total students for now)
        const activeStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;

        // Monthly Revenue
        const revenue = db.prepare('SELECT SUM(amount) as total FROM payments WHERE month = ?').get(currentMonth).total || 0;

        // Pending Payments (Students who haven't paid this month)
        // This is a bit complex. For simplicity: Total Active Students - Students who paid this month.
        // Get count of unique students who paid this month
        const paidCount = db.prepare('SELECT COUNT(DISTINCT regNum) as count FROM payments WHERE month = ?').get(currentMonth).count;
        const pendingPayments = activeStudents - paidCount;

        return {
            totalStudents: activeStudents,
            monthlyRevenue: revenue,
            pendingPayments: Math.max(0, pendingPayments) // Ensure not negative
        };
    });

    ipcMain.handle('get-admin-payment-stats', () => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        const currentDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD to match storage 
        // Note: In add-payment, we use `date` passed from frontend. Frontend usually uses `new Date().toLocaleDateString()`.
        // Ideally we should use ISO strings for dates to be safe, but let's stick to existing pattern or check DB.

        // 1. Total Revenue
        const totalRevenue = db.prepare('SELECT SUM(amount) as total FROM payments').get().total || 0;

        // 2. Monthly Revenue (Reuse logic)
        const monthlyRevenue = db.prepare('SELECT SUM(amount) as total FROM payments WHERE month = ?').get(currentMonth).total || 0;

        // 3. Today's Revenue
        // We need to match the date format stored in DB. Assuming it's `toLocaleDateString()`.
        // Let's check a record or assume standard. `new Date().toLocaleDateString()` is risky if format differs.
        // But since we are sorting by date in history, likely it works or we need a fuzzy match?
        // Let's try to get payments where date matches today's date string.
        const todaysRevenue = db.prepare('SELECT SUM(amount) as total FROM payments WHERE date = ?').get(currentDate).total || 0;

        // 4. Pending Amount Calculation
        // This is expensive. We need to iterate active students and check if they paid for their classes this month.
        const categories = db.prepare('SELECT name, fee FROM class_categories').all();
        const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.fee }), {});

        const students = db.prepare('SELECT regNum, class FROM students').all();
        const paymentsThisMonth = db.prepare('SELECT regNum, class FROM payments WHERE month = ?').all(currentMonth);

        // Map: regNum -> Set(paidClasses)
        const paymentMap = {};
        paymentsThisMonth.forEach(p => {
            if (!paymentMap[p.regNum]) paymentMap[p.regNum] = new Set();
            if (p.class) paymentMap[p.regNum].add(p.class);
        });

        let pendingAmount = 0;
        students.forEach(s => {
            let userClasses = [];
            try { userClasses = JSON.parse(s.class); } catch (e) { userClasses = [s.class]; }
            if (!Array.isArray(userClasses)) userClasses = [s.class];

            userClasses.forEach(clsName => {
                if (!paymentMap[s.regNum]?.has(clsName)) {
                    // Not paid
                    pendingAmount += (categoryMap[clsName] || 0);
                }
            });
        });

        return {
            totalRevenue,
            monthlyRevenue,
            todaysRevenue,
            pendingAmount
        };
    });

    ipcMain.handle('get-revenue-chart', () => {
        // Last 30 days revenue
        // SQLite doesn't have a simple date range generator, so we might return existing data 
        // and handle filling gaps in frontend, OR just return recent payments grouped by date.
        // Let's return last 30 payments grouped by date for now.
        const stmt = db.prepare(`
            SELECT date, SUM(amount) as value 
            FROM payments 
            GROUP BY date 
            ORDER BY date DESC 
            LIMIT 30
        `);
        return stmt.all().reverse(); // Chronological order
    });

    ipcMain.handle('get-recent-activity', () => {
        // Combine recent registrations and payments
        // We can do two queries and merge/sort in JS
        // Note: Students table uses regNum as PK, no 'id' column
        const recentStudents = db.prepare('SELECT regNum, name, created_at FROM students ORDER BY created_at DESC LIMIT 5').all();
        const recentPayments = db.prepare(`
            SELECT p.id, s.name, p.amount, p.created_at 
            FROM payments p 
            JOIN students s ON p.regNum = s.regNum 
            ORDER BY p.created_at DESC 
            LIMIT 5
        `).all();

        const activities = [
            ...recentStudents.map(s => ({
                type: 'registration',
                title: 'New Student Registered',
                desc: `${s.name} - ${s.regNum}`,
                time: s.created_at,
                id: `reg-${s.regNum}`
            })),
            ...recentPayments.map(p => ({
                type: 'payment',
                title: 'Payment Received',
                desc: `${p.name} - LKR ${p.amount}`,
                time: p.created_at,
                id: `pay-${p.id}`
            }))
        ];

        // Sort by time descending and take top 5
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return activities.slice(0, 5);
    });

    ipcMain.handle('get-all-payments', () => {
        return db.prepare(`
            SELECT p.*, s.name as studentName, COALESCE(p.class, s.class) as class
            FROM payments p 
            LEFT JOIN students s ON p.regNum = s.regNum 
            ORDER BY p.id DESC
        `).all();
    });

    // --- IPC Handlers for Exam Results ---
    ipcMain.handle('get-upcoming-birthdays', () => {
        const students = db.prepare("SELECT regNum, name, dob, class FROM students WHERE dob IS NOT NULL AND dob != ''").all();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = students.filter(s => {
            const dob = new Date(s.dob);
            if (isNaN(dob.getTime())) return false;

            const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBday.getTime() < today.getTime()) {
                nextBday.setFullYear(today.getFullYear() + 1);
            }

            const diffTime = nextBday.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays >= 0 && diffDays <= 5;
        });

        upcoming.sort((a, b) => {
            const aDob = new Date(a.dob);
            const bDob = new Date(b.dob);
            const aNext = new Date(today.getFullYear(), aDob.getMonth(), aDob.getDate());
            if (aNext.getTime() < today.getTime()) aNext.setFullYear(today.getFullYear() + 1);
            const bNext = new Date(today.getFullYear(), bDob.getMonth(), bDob.getDate());
            if (bNext.getTime() < today.getTime()) bNext.setFullYear(today.getFullYear() + 1);

            return aNext.getTime() - bNext.getTime();
        });

        return upcoming.map(s => {
            const dob = new Date(s.dob);
            const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBday.getTime() < today.getTime()) nextBday.setFullYear(today.getFullYear() + 1);
            const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let classes = [];
            try { classes = JSON.parse(s.class); } catch (e) { classes = [s.class]; }
            if (!Array.isArray(classes)) classes = [s.class];

            return {
                regNum: s.regNum,
                name: s.name,
                dob: s.dob,
                classes: classes,
                daysUntil: diffDays,
                nextBirthday: nextBday.toISOString().split('T')[0]
            };
        });
    });

    // --- IPC Handlers for Exam Results ---
    ipcMain.handle('get-exam-results', (event, { className, statusFilter = 'All' }) => {
        try {
            // Get all students enrolled in the class using a LIKE clause since class is JSON string
            const studentsStmt = db.prepare(`
                SELECT regNum, name, class 
                FROM students 
                WHERE class LIKE ?
            `);
            const students = studentsStmt.all(`%"${className}"%`);

            // Fetch existing results for this class
            const resultsStmt = db.prepare(`
                SELECT regNum, result, date
                FROM exam_results 
                WHERE class_name = ?
            `);
            const results = resultsStmt.all(className);
            const resultMap = {};
            results.forEach(r => resultMap[r.regNum] = { result: r.result, date: r.date });

            // Merge students with their results
            let merged = students.map(s => {
                const existing = resultMap[s.regNum];
                return {
                    regNum: s.regNum,
                    name: s.name,
                    className: className,
                    result: existing ? existing.result : 'None',
                    date: existing ? existing.date : new Date().toISOString().split('T')[0]
                };
            });

            // Apply filter
            if (statusFilter !== 'All') {
                merged = merged.filter(m => m.result === statusFilter);
            }

            return merged;
        } catch (error) {
            console.error("Error getting exam results:", error);
            throw error;
        }
    });

    ipcMain.handle('save-exam-results', (event, { className, results }) => {
        try {
            // SQLite doesn't have true UPSERT without UNIQUE constraint on multiple columns,
            // so we will manually check and strictly update or insert per student/class combination.

            const existingStmt = db.prepare('SELECT id FROM exam_results WHERE regNum = ? AND class_name = ?');
            const updateStmt = db.prepare('UPDATE exam_results SET result = ?, date = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?');
            const insertStmt = db.prepare('INSERT INTO exam_results (regNum, class_name, result, date) VALUES (?, ?, ?, ?)');

            const transaction = db.transaction((updates) => {
                for (const item of updates) {
                    const existing = existingStmt.get(item.regNum, className);
                    if (existing) {
                        updateStmt.run(item.result, item.date, existing.id);
                    } else {
                        insertStmt.run(item.regNum, className, item.result, item.date);
                    }
                }
            });

            transaction(results);
            return { success: true };
        } catch (error) {
            console.error("Error saving exam results:", error);
            throw error;
        }
    });

    ipcMain.handle('export-exam-results', async (event, { className, duration, data }) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Exam Results');

            // Define columns
            worksheet.columns = [
                { header: 'Student ID', key: 'regNum', width: 15 },
                { header: 'Student Name', key: 'name', width: 30 },
                { header: 'Course', key: 'course', width: 20 },
                { header: 'Duration', key: 'duration', width: 25 },
                { header: 'Result', key: 'result', width: 15 }
            ];

            // Add rows
            data.forEach(item => {
                worksheet.addRow({
                    regNum: item.regNum,
                    name: item.name,
                    course: className,
                    duration: duration,
                    result: item.result
                });
            });

            // Style header
            worksheet.getRow(1).font = { bold: true };

            // Open Save Dialog
            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Exam Results',
                defaultPath: `Exam_Results_${className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
                filters: [
                    { name: 'Excel Workbook', extensions: ['xlsx'] }
                ]
            });

            if (filePath) {
                // Write to file
                await workbook.xlsx.writeFile(filePath);
                return { success: true, path: filePath };
            } else {
                return { success: false, cancelled: true };
            }
        } catch (error) {
            console.error("Error exporting exam results:", error);
            throw error;
        }
    });

    ipcMain.handle('get-revenue-by-class', () => {
        return db.prepare(`
            SELECT class, SUM(amount) as total 
            FROM payments 
            WHERE class IS NOT NULL 
            GROUP BY class
        ORDER BY total DESC
            `).all();
    });

    ipcMain.handle('get-monthly-revenue-trend', () => {
        // Return revenue grouped by month for the last 12 months? 
        // We store 'month' as a string "Month Year" (e.g. "January 2026").
        // This makes sorting by SQL hard without Parsing. 
        // So we will fetch grouped by 'month' string and process in JS.
        // Or better, fetch all payments with date, and group in JS which is safer for sorting.
        // But doing it here is cleaner for frontend.
        // Let's just group by the existing 'month' column and we'll have to parse it to sort it.
        const data = db.prepare(`
            SELECT month, SUM(amount) as total 
            FROM payments 
            GROUP BY month
        `).all();

        // We need to sort these chronologically. 
        // They are like "January 2026", "December 2025".
        data.sort((a, b) => {
            return new Date(a.month).getTime() - new Date(b.month).getTime();
        });

        // Limit to last 6-12 entries if needed, or return all. Let's return last 6.
        return data.slice(-6);
    });

    // --- IPC Handlers for Class Categories ---
    ipcMain.handle('get-class-categories', () => {
        const stmt = db.prepare('SELECT * FROM class_categories ORDER BY created_at ASC');
        return stmt.all();
    });

    ipcMain.handle('add-class-category', (event, category) => {
        const stmt = db.prepare('INSERT INTO class_categories (name, fee, duration) VALUES (@name, @fee, @duration)');
        const info = stmt.run({ ...category, duration: category.duration || '3 months' });
        return { ...category, duration: category.duration || '3 months', id: info.lastInsertRowid };
    });

    ipcMain.handle('update-class-category', (event, category) => {
        const stmt = db.prepare('UPDATE class_categories SET name = @name, fee = @fee, duration = @duration WHERE id = @id');
        stmt.run({ ...category, duration: category.duration || '3 months' });
        return category;
    });

    ipcMain.handle('delete-class-category', (event, id) => {
        const stmt = db.prepare('DELETE FROM class_categories WHERE id = ?');
        stmt.run(id);
        return id;
    });

    // --- IPC Handlers for Email ---
    // --- IPC Handlers for Email ---
    ipcMain.handle('send-receipt-email', async (event, emailData) => {
        // Return IMMEDIATELY to unblock UI
        // Process in background
        processEmailInBackground(emailData).catch(err => {
            console.error("Background Email Failed:", err);
        });

        return { success: true, queued: true };
    });

    // Helper for background email sending
    async function processEmailInBackground(data) {
        const { email, studentName, amount, date, receiptNo, course } = data;

        // Configure Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dreamjapanmatara@gmail.com',
                pass: 'yjoh jllo mdmt cpyj'
            }
        });

        const logoPath = join(__dirname, '../src/assets/SLDJ_PNG.png');

        // Generate PDF
        let pdfBuffer = null;
        try {
            console.log("Generating PDF Receipt...");
            pdfBuffer = await generateReceiptPDF(data, logoPath);
        } catch (pdfErr) {
            console.error("PDF Generation Failed:", pdfErr);
            // Continue without PDF if fails? Or stop? 
            // Better to send email without PDF than nothing, or maybe critical fail?
            // Let's attach if successful.
        }

        // HTML Template
        const htmlContent = `
        < div style = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;" >
                <div style="text-align: center; background-color: #f8fafc; padding: 20px; border-radius: 10px 10px 0 0;">
                    <img src="cid:logo" alt="SL Dream Japan" style="height: 80px; margin-bottom: 10px;" />
                    <h1 style="color: #FF0000; margin: 0;">SL Dream Japan</h1>
                    <p style="color: #64748b; margin-top: 5px;">Payment Receipt</p>
                </div>
                
                <div style="padding: 20px;">
                    <p>Dear <strong>${studentName}</strong>,</p>
                    <p>Thank you for your payment. Please find the official receipt attached to this email.</p>
                    
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                         <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold; text-align: center;">
                            Paid: LKR ${amount}
                         </p>
                    </div>

                    <p style="color: #64748b; font-size: 14px;">Transaction Details:</p>
                    <ul style="color: #475569; font-size: 14px;">
                        <li>Receipt No: <strong>${receiptNo}</strong></li>
                        <li>Date: ${date}</li>
                        <li>Course: ${course}</li>
                    </ul>

                    <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} SL Dream Japan Institute. All rights reserved.</p>
                    </div>
                </div>
            </div >
        `;

        try {
            const mailOptions = {
                from: '"SL Dream Japan" <noreply@sldreamjapan.com>',
                to: email,
                subject: `Payment Receipt - ${receiptNo} `,
                html: htmlContent,
                attachments: [
                    {
                        filename: 'SLDJ_PNG.png',
                        path: logoPath,
                        cid: 'logo'
                    }
                ]
            };

            // Attach PDF if generated
            if (pdfBuffer) {
                mailOptions.attachments.push({
                    filename: `Receipt - ${receiptNo}.pdf`,
                    content: pdfBuffer
                });
            }

            await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${email} `);
            return { success: true };
        } catch (error) {
            console.error("Failed to send email:", error);
            throw error;
        }
    }


    // --- IPC Handlers for SMS ---
    ipcMain.handle('get-sms-config', () => {
        return loadSmsConfig();
    });

    ipcMain.handle('save-sms-config', (event, config) => {
        saveSmsConfig(config);
        setupScheduler(); // Restart scheduler with new settings
        return config;
    });

    ipcMain.handle('trigger-payment-reminders', async () => {
        console.log("[MANUAL TRIGGER] Starting payment reminder check...");
        return await checkAndSendReminders(true);
    });

    // --- IPC Handlers for 2FA OTP ---
    ipcMain.handle('send-2fa-otp', async (event, { phone }) => {
        // 1. Get Settings
        const settings = loadSmsConfig();
        if (!settings || !settings.enabled) {
            return { success: false, error: "SMS Service Disabled" };
        }

        // 2. Determine Recipient
        // Priority: Passed Phone > Settings AdminPhone > Error
        const targetPhone = phone || settings.adminPhone;

        if (!targetPhone) {
            return { success: false, error: "No Admin Phone Number configured." };
        }

        // 3. Generate Code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore = {
            code: code,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        };

        // 4. Send SMS
        const message = `SLDJ Admin Login Code: ${code}. Valid for 5 minutes.`;
        try {
            // Force Sender ID to 'SLDJ' for OTP to prevent lockout if DB has invalid 'TextLKDemo'
            // Use 'Notify' as a common fallback if SLDJ isn't registered, but let's try SLDJ first matching the brand.
            const otpSettings = { ...settings, senderId: 'SLDJ' };

            // Check if we are in Mock Mode (No API Key or Default Provider)
            const isMock = !settings.apiKey || (settings.provider && settings.provider.toLowerCase() !== 'text.lk');

            if (isMock) {
                // Show Dialog with Code so User isn't locked out
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Developer/Mock OTP',
                    message: `Your Login Code: ${code} `,
                    detail: 'SMS Gateway is not configured. Use this code to login and configure SMS settings.',
                    buttons: ['OK']
                });
            }

            const res = await smsService.sendSMS(targetPhone, message, otpSettings);

            // Log it
            db.prepare('INSERT INTO sms_logs (recipient, message, status) VALUES (?, ?, ?)').run(
                targetPhone, message, res.success ? 'sent' : 'failed'
            );

            return res;
        } catch (e) {
            console.error("OTP Send Error:", e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('verify-2fa-otp', (event, code) => {
        console.log(`[AUTH] Verifying OTP: Input = ${code}, Actual = ${otpStore.code} `);

        if (!otpStore.code || !otpStore.expires) {
            return { success: false, error: "No OTP request found. Please try again." };
        }

        if (Date.now() > otpStore.expires) {
            otpStore = { code: null, expires: 0 };
            return { success: false, error: "OTP has expired." };
        }

        if (code === otpStore.code) {
            // Success
            otpStore = { code: null, expires: 0 }; // Consume OTP
            return { success: true };
        } else {
            return { success: false, error: "Invalid Verification Code." };
        }
    });

    ipcMain.handle('get-sms-balance', async () => {
        const settings = loadSmsConfig();
        if (!settings) return { success: false, error: "No settings found" };

        // If mocked or invalid key, return placeholder. allow case-insensitive 'text.lk'
        const provider = (settings.provider || '').toLowerCase().trim();
        if (!settings.apiKey || !provider.includes('text.lk')) {
            return { success: false, error: "Set provider to 'text.lk'" };
        }

        return await smsService.getBalance(settings);
    });

    ipcMain.handle('send-manual-sms', async (event, { recipients, message }) => {
        const settings = loadSmsConfig();
        if (!settings || !settings.enabled) {
            throw new Error("SMS service is disabled in settings.");
        }

        let successCount = 0;
        let failCount = 0;

        for (const phone of recipients) {
            try {
                const res = await smsService.sendSMS(phone, message, settings);
                db.prepare('INSERT INTO sms_logs (recipient, message, status) VALUES (?, ?, ?)').run(
                    phone, message, res.success ? 'sent' : 'failed'
                );
                if (res.success) successCount++; else failCount++;
            } catch (e) {
                console.error(`Failed to send to ${phone} `, e);
                failCount++;
                db.prepare('INSERT INTO sms_logs (recipient, message, status) VALUES (?, ?, ?)').run(
                    phone, message, 'error'
                );
            }
        }
        return { successCount, failCount };
    });

    ipcMain.handle('get-sms-logs', () => {
        // Return last 5 logs desc
        return db.prepare('SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 5').all();
    });

    // --- IPC Handlers for General Finance ---
    ipcMain.handle('get-finance-records', (event, { startDate, endDate, type }) => {
        let query = 'SELECT * FROM finance_records WHERE 1=1';
        const params = [];

        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY date DESC, created_at DESC';
        return db.prepare(query).all(...params);
    });

    ipcMain.handle('add-finance-record', (event, record) => {
        const stmt = db.prepare(`
            INSERT INTO finance_records (type, category, amount, description, date, reference)
            VALUES (@type, @category, @amount, @description, @date, @reference)
        `);
        const info = stmt.run(record);
        return { ...record, id: info.lastInsertRowid };
    });

    ipcMain.handle('delete-finance-record', (event, id) => {
        db.prepare('DELETE FROM finance_records WHERE id = ?').run(id);
        return id;
    });

    ipcMain.handle('get-finance-summary', (event, { startDate, endDate }) => {
        // 1. Get Extra Income/Expense from finance_records
        let financeQuery = 'SELECT type, SUM(amount) as total FROM finance_records WHERE 1=1';
        const params = [];
        if (startDate) { financeQuery += ' AND date >= ?'; params.push(startDate); }
        if (endDate) { financeQuery += ' AND date <= ?'; params.push(endDate); }
        financeQuery += ' GROUP BY type';

        const financeStats = db.prepare(financeQuery).all(...params);

        // 2. Get Student Payments (Revenue)
        let paymentQuery = 'SELECT SUM(amount) as total FROM payments WHERE 1=1';
        const pParams = [];
        // Note: payments table uses 'date' which might be YYYY-MM-DD or other.
        // If it's YYYY-MM-DD, we can use the same bounds.
        if (startDate) { paymentQuery += ' AND date >= ?'; pParams.push(startDate); }
        if (endDate) { paymentQuery += ' AND date <= ?'; pParams.push(endDate); }

        const studentRevenue = db.prepare(paymentQuery).get(...pParams).total || 0;

        let extraIncome = 0;
        let totalExpense = 0;

        financeStats.forEach(s => {
            if (s.type === 'income') extraIncome = s.total;
            else if (s.type === 'expense') totalExpense = s.total;
        });

        return {
            studentRevenue,
            extraIncome,
            totalIncome: studentRevenue + extraIncome,
            totalExpense,
            netProfit: (studentRevenue + extraIncome) - totalExpense
        };
    });

    // --- AUTOMATED SCHEDULER LOGIC ---
    let scheduledTask = null;

    async function checkAndSendReminders(isManual = false) {
        console.log(`[REMINDER] Starting check.Manual: ${isManual} `);
        const now = new Date();
        const day = now.getDate();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        // 1. Get settings
        const settings = loadSmsConfig();
        if (!settings || !settings.enabled) {
            console.log("[REMINDER] SMS Disabled. Skipping.");
            return { success: false, message: "SMS Disabled" };
        }

        // 2. Check Date (Skip if manual)
        const targetDate = settings.reminderDate || 7; // Default 7th
        if (!isManual && day !== targetDate) {
            console.log(`[REMINDER] Today is ${day}, target is ${targetDate}.Skipping.`);
            return { success: true, message: "Not date yet" };
        }

        // 3. Find unpaid students
        const payments = db.prepare('SELECT regNum, class FROM payments WHERE month = ?').all(currentMonth);
        const paidMap = {};
        payments.forEach(p => {
            if (!paidMap[p.regNum]) paidMap[p.regNum] = new Set();
            if (p.class) paidMap[p.regNum].add(p.class);
        });

        const students = db.prepare('SELECT regNum, phone, name, class FROM students').all();
        let sentCount = 0;
        let failCount = 0;

        for (const s of students) {
            if (!s.phone) continue;

            let classes = [];
            try { classes = JSON.parse(s.class); } catch (e) { classes = [s.class]; }
            if (!Array.isArray(classes)) classes = [s.class];

            // Check pending
            const pendingClasses = classes.filter(cls => !paidMap[s.regNum]?.has(cls));

            if (pendingClasses.length > 0) {
                // Send reminder
                const message = `${currentMonth} සඳහා ${pendingClasses.join(', ')} ගෙවීම තවමත් සිදු කර නොමැත.කරුණාකර මෙම මස 10 වන දිනට පෙර ගෙවීමට කටයුතු කරන්න.\n— SL Dream Japan`;

                try {
                    const res = await smsService.sendSMS(s.phone, message, settings);
                    console.log(`Reminder sent to ${s.name} (${s.phone}): ${res.success} `);

                    db.prepare('INSERT INTO sms_logs (recipient, message, status) VALUES (?, ?, ?)').run(
                        s.phone, message, res.success ? 'sent' : 'failed'
                    );

                    if (res.success) sentCount++; else failCount++;
                } catch (e) {
                    console.error(`Failed to send reminder to ${s.phone} `, e);
                    failCount++;
                }
            }
        }

        return { success: true, sent: sentCount, failed: failCount };
    }

    function setupScheduler() {
        // Stop existing
        if (scheduledTask) {
            scheduledTask.stop();
            scheduledTask = null;
        }

        const settings = loadSmsConfig();
        if (!settings || !settings.enabled) {
            console.log("[SCHEDULER] SMS Disabled. Scheduler not started.");
            return;
        }

        const time = settings.reminderTime || '09:00';
        const [hour, minute] = time.split(':');

        // Cron Format: Minute Hour * * *
        const cronExpression = `${minute || 0} ${hour || 9} * * * `;

        console.log(`[SCHEDULER] Starting with schedule: ${cronExpression} (Date: ${settings.reminderDate || 7})`);

        scheduledTask = cron.schedule(cronExpression, async () => {
            console.log("[SCHEDULER] Triggered by cron.");
            await checkAndSendReminders(false);
        });
    }

    // Initialize Scheduler
    setupScheduler();
});

console.log("App ready.");

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
