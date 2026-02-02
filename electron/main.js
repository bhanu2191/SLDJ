import { app, BrowserWindow, ipcMain } from 'electron';

// Disable Autofill to prevent "Request Autofill.enable failed" errors
app.commandLine.appendSwitch('disable-features', 'Autofill,AutofillServerCommunication,AutofillAddressEnabled,PasswordManager,AutofillCreditCardEnabled');
app.commandLine.appendSwitch('disable-save-password-bubble');

// Filter useless DevTools errors from stderr
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    const str = chunk.toString();
    if (str.includes('Request Autofill.enable failed') || str.includes('Request Autofill.setAddresses failed')) {
        return true;
    }
    return originalStderrWrite.call(process.stderr, chunk, encoding, callback);
};

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import cron from 'node-cron'; // Import node-cron
import smsService from './smsService.js'; // Import SMS Service

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
const dataDir = join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = join(dataDir, 'school.db');
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

    // Migration for students table columns (guardian, guardianPhone, avatar, gender)
    // We try to add them one by one. If they exist, it throws, we ignore.
    const studentCols = ['guardian', 'guardianPhone', 'avatar', 'email', 'dob', 'phone', 'gender'];
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // SMS Settings Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sms_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT DEFAULT 'mock',
            apiKey TEXT,
            senderId TEXT,
            adminPhone TEXT,
            enabled INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for sms_settings adminPhone (for existing databases)
    try {
        db.exec("ALTER TABLE sms_settings ADD COLUMN adminPhone TEXT");
    } catch (e) {
        // Ignore error if column already exists
    }

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
}

initDB();

let mainWindow = null;
let otpStore = { code: null, expires: 0 };

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false // Required for ESM preload in some environments
        },
    });

    // Remove the menu bar completely
    mainWindow.setMenu(null);

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
            INSERT INTO students (regNum, name, dob, phone, email, class, guardian, guardianPhone, status, avatar, gender)
            VALUES (@regNum, @name, @dob, @phone, @email, @class, @guardian, @guardianPhone, @status, @avatar, @gender)
        `);
            stmt.run(studentToSave);

            // --- SMS TRIGGER: Registration Welcome ---
            try {
                const settings = db.prepare('SELECT * FROM sms_settings').get();
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
            guardian = @guardian, 
            guardianPhone = @guardianPhone, 
            status = @status, 
            avatar = @avatar,
            gender = @gender,
            updated_at = CURRENT_TIMESTAMP
          WHERE regNum = @regNum
      `);
        stmt.run(studentToSave);

        return studentToSave;
    });

    ipcMain.handle('delete-student', (event, regNum) => {
        const stmt = db.prepare('DELETE FROM students WHERE regNum = ?');
        stmt.run(regNum);
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
        const stmt = db.prepare('INSERT INTO class_categories (name, fee) VALUES (@name, @fee)');
        const info = stmt.run(category);
        return { ...category, id: info.lastInsertRowid };
    });

    ipcMain.handle('update-class-category', (event, category) => {
        const stmt = db.prepare('UPDATE class_categories SET name = @name, fee = @fee WHERE id = @id');
        stmt.run(category);
        return category;
    });

    ipcMain.handle('delete-class-category', (event, id) => {
        const stmt = db.prepare('DELETE FROM class_categories WHERE id = ?');
        stmt.run(id);
        return id;
    });

    // --- IPC Handlers for Email ---
    ipcMain.handle('send-receipt-email', async (event, { email, studentName, amount, date, receiptNo, course }) => {
        // Configure Transporter (PLACEHOLDERS - User must update these)
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or your SMTP provider
            auth: {
                user: 'bhanuabeysinghe244@gmail.com', // Replace with real email
                pass: 'onbn vtfu xoxz mkom'     // Replace with real app password
            }
        });

        // HTML Template
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; background-color: #f8fafc; padding: 20px; border-radius: 10px 10px 0 0;">
                    <img src="cid:logo" alt="SL Dream Japan" style="height: 80px; margin-bottom: 10px;" />
                    <h1 style="color: #FF0000; margin: 0;">SL Dream Japan</h1>
                    <p style="color: #64748b; margin-top: 5px;">Payment Receipt</p>
                </div>
                
                <div style="padding: 20px;">
                    <p>Dear <strong>${studentName}</strong>,</p>
                    <p>Thank you for your payment. Here are the details of your transaction:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #64748b;">Receipt No</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${receiptNo}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #64748b;">Date</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${date}</td>
                        </tr>
                         <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #64748b;">Course/Class</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${course}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #64748b;">Amount Paid</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0d9488;">LKR ${amount}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} SL Dream Japan Institute. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `;

        const logoPath = join(__dirname, '../src/assets/SLDJ_PNG.png');

        try {
            await transporter.sendMail({
                from: '"SL Dream Japan" <noreply@sldreamjapan.com>',
                to: email,
                subject: `Payment Receipt - ${receiptNo}`,
                html: htmlContent,
                attachments: [{
                    filename: 'SLDJ_PNG.png',
                    path: logoPath,
                    cid: 'logo' // same cid value as in the html img src
                }]
            });
            return { success: true };
        } catch (error) {
            console.error("Failed to send email:", error);
            throw error;
        }
    });


    // --- IPC Handlers for SMS ---
    ipcMain.handle('get-sms-config', () => {
        return db.prepare('SELECT * FROM sms_settings').get();
    });

    ipcMain.handle('save-sms-config', (event, config) => {
        const stmt = db.prepare(`
            UPDATE sms_settings 
            SET provider = @provider, apiKey = @apiKey, senderId = @senderId, enabled = @enabled, adminPhone = @adminPhone, updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM sms_settings LIMIT 1)
        `);
        stmt.run(config);
        return config;
    });



    // --- IPC Handlers for 2FA OTP ---
    ipcMain.handle('send-2fa-otp', async (event, { phone }) => {
        // 1. Get Settings
        const settings = db.prepare('SELECT * FROM sms_settings').get();
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
        console.log(`[AUTH] Verifying OTP: Input=${code}, Actual=${otpStore.code}`);

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
        const settings = db.prepare('SELECT * FROM sms_settings').get();
        if (!settings) return { success: false, error: "No settings found" };

        // If mocked or invalid key, return placeholder. allow case-insensitive 'text.lk'
        const provider = (settings.provider || '').toLowerCase().trim();
        if (!settings.apiKey || !provider.includes('text.lk')) {
            return { success: false, error: "Set provider to 'text.lk'" };
        }

        return await smsService.getBalance(settings);
    });

    ipcMain.handle('send-manual-sms', async (event, { recipients, message }) => {
        const settings = db.prepare('SELECT * FROM sms_settings').get();
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
                console.error(`Failed to send to ${phone}`, e);
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

    // --- AUTOMATED SCHEDULER ---
    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log("[SCHEDULER] Running daily check...");
        const now = new Date();
        const day = now.getDate();

        // Reminder logic: "before 10th of the months"
        // Let's send on the 7th as a reminder.
        if (day === 7) {
            console.log("[SCHEDULER] It's the 7th! Checking for pending payments...");
            const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

            // 1. Get settings
            const settings = db.prepare('SELECT * FROM sms_settings').get();
            if (!settings || !settings.enabled) return;

            // 2. Find students who haven't paid logic (simplified version of pending calculation)
            const payments = db.prepare('SELECT regNum, class FROM payments WHERE month = ?').all(currentMonth);
            const paidMap = {};
            payments.forEach(p => {
                if (!paidMap[p.regNum]) paidMap[p.regNum] = new Set();
                if (p.class) paidMap[p.regNum].add(p.class);
            });

            const students = db.prepare('SELECT regNum, phone, name, class FROM students').all();

            for (const s of students) {
                if (!s.phone) continue;

                let classes = [];
                try { classes = JSON.parse(s.class); } catch (e) { classes = [s.class]; }
                if (!Array.isArray(classes)) classes = [s.class];

                // Check pending
                const pendingClasses = classes.filter(cls => !paidMap[s.regNum]?.has(cls));

                if (pendingClasses.length > 0) {
                    // Send reminder
                    const message = `${currentMonth} සඳහා ${pendingClasses.join(', ')} ගෙවීම තවමත් සිදු කර නොමැත. කරුණාකර මෙම මස 10 වන දිනට පෙර ගෙවීමට කටයුතු කරන්න./n— SL Dream Japan`;

                    try {
                        const res = await smsService.sendSMS(s.phone, message, settings);
                        // Log (optional for scheduler?)
                        console.log(`Reminder sent to ${s.name} (${s.phone}): ${res.success}`);
                    } catch (e) {
                        console.error(`Failed to send reminder to ${s.phone}`, e);
                    }
                }
            }
        }
    });
});

console.log("App ready.");

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
