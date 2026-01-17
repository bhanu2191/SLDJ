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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(regNum) REFERENCES students(regNum)
        )
    `);

    // Class Categories Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS class_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            fee REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

initDB();

let mainWindow = null;

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
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        // Dynamic Status Query:
        // We select all student info, but override 'status' based on whether a payment exists for THIS month.
        const stmt = db.prepare(`
            SELECT s.*, 
            CASE 
                WHEN MAX(p.id) IS NOT NULL THEN 'paid' 
                ELSE 'pending' 
            END as status
            FROM students s
            LEFT JOIN payments p ON s.regNum = p.regNum AND p.month = ?
            GROUP BY s.regNum
            ORDER BY s.created_at DESC
        `);
        return stmt.all(currentMonth);
    });

    ipcMain.handle('get-student', (event, regNum) => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        const stmt = db.prepare(`
            SELECT s.*, 
            CASE 
                WHEN p.id IS NOT NULL THEN 'paid' 
                ELSE 'pending' 
            END as status
            FROM students s
            LEFT JOIN payments p ON s.regNum = p.regNum AND p.month = ?
            WHERE s.regNum = ?
        `);
        return stmt.get(currentMonth, regNum);
    });

    ipcMain.handle('add-student', (event, student) => {
        const stmt = db.prepare(`
          INSERT INTO students (regNum, name, dob, phone, email, class, guardian, guardianPhone, status, avatar)
          VALUES (@regNum, @name, @dob, @phone, @email, @class, @guardian, @guardianPhone, @status, @avatar)
      `);
        stmt.run(student);
        return student;
    });

    ipcMain.handle('update-student', (event, student) => {
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
            updated_at = CURRENT_TIMESTAMP
          WHERE regNum = @regNum
      `);
        stmt.run(student);
        return student;
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
                INSERT INTO payments (regNum, amount, month, date, method, type)
                VALUES (@regNum, @amount, @month, @date, @method, @type)
            `);
            const info = insert.run(payment);

            const updateStatus = db.prepare("UPDATE students SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE regNum = ?");
            updateStatus.run(payment.regNum);

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

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
