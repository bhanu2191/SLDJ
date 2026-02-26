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
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cron from 'node-cron'; // Import node-cron

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Missing Supabase credentials in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);
import smsService from './smsService.js'; // Import SMS Service
import PDFDocument from 'pdfkit'; // Import PDFKit
import ExcelJS from 'exceljs'; // Import exceljs for exports instead of missing xlsx

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
// Database is now hosted on Supabase.
// Local SQLite initiation and migration logic has been removed.

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

let mainWindow = null;
let otpStore = { code: null, expires: 0 };

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Don't show until ready to prevent resizing glitch
        backgroundColor: '#ffffff', // Prevent visual stutter by setting a solid background color
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
    ipcMain.handle('get-students', async () => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dayOfMonth = now.getDate();
        const isLate = dayOfMonth > 10;

        const { data: students, error: stdErr } = await supabase.from('students').select('*').order('created_at', { ascending: false });
        if (stdErr) throw stdErr;

        // Get this month's payments with class info
        const { data: payments, error: payErr } = await supabase.from('payments').select('regNum, class').eq('month', currentMonth);
        if (payErr) throw payErr;

        // Create map of regNum -> Set of paid classes
        const paymentMap = {};
        (payments || []).forEach(p => {
            if (!paymentMap[p.regNum]) paymentMap[p.regNum] = new Set();
            if (p.class) paymentMap[p.regNum].add(p.class);
        });

        return (students || []).map(s => {
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
                const isPaid = paymentMap[s.regNum]?.has(clsName);
                let status = 'pending';
                if (isPaid) status = 'paid';
                else if (isLate) status = 'overdue';
                return { className: clsName, status };
            });

            // Aggregate status
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

    ipcMain.handle('get-student', async (event, regNum) => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dayOfMonth = now.getDate();
        const isLate = dayOfMonth > 10;

        const { data: student, error: stdErr } = await supabase.from('students').select('*').eq('regNum', regNum).single();
        if (stdErr || !student) return null;

        const { data: payments, error: payErr } = await supabase.from('payments').select('class').eq('regNum', regNum).eq('month', currentMonth);
        const paidClasses = new Set((payments || []).map(p => p.class));

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
    ipcMain.handle('get-next-student-id', async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('regNum')
                // Note: We need to order by the text value. Since they are formatted like 025, 026, text ordering works correctly here.
                .order('regNum', { ascending: false })
                .limit(1);

            if (error) throw error;

            let nextIdNumber = 25; // Default starting number
            if (data && data.length > 0 && data[0].regNum) {
                // Format: '2026/JL/026'
                const parts = data[0].regNum.split('/');
                if (parts.length === 3) {
                    const lastId = parseInt(parts[2], 10);
                    if (!isNaN(lastId)) {
                        nextIdNumber = lastId + 1;
                    }
                }
            }
            return `2026/JL/${nextIdNumber.toString().padStart(3, '0')}`;
        } catch (err) {
            console.error("Failed to get next student ID:", err);
            return `2026/JL/025`; // Safe fallback
        }
    });

    ipcMain.handle('add-student', async (event, student) => {
        try {
            console.log("Adding Student Payload:", student);

            const studentToSave = { ...student };
            if (Array.isArray(studentToSave.class)) {
                studentToSave.class = JSON.stringify(studentToSave.class);
            }

            const { data, error } = await supabase.from('students').insert([{
                regNum: studentToSave.regNum,
                name: studentToSave.name,
                dob: studentToSave.dob,
                phone: studentToSave.phone,
                email: studentToSave.email,
                class: studentToSave.class,
                enrollments: studentToSave.enrollments || null,
                guardian: studentToSave.guardian,
                guardianPhone: studentToSave.guardianPhone,
                status: studentToSave.status || 'pending',
                avatar: studentToSave.avatar,
                gender: studentToSave.gender
            }]).select();

            if (error) throw error;

            // --- SMS TRIGGER: Registration Welcome ---
            try {
                const { data: settings } = await supabase.from('sms_settings').select('*').single();
                if (settings && settings.enabled) {
                    const message = `SL Dream Japan වෙත ලියාපදිංචි වූ ඔබට ස්තුතියි. ඔබගේ අධ්‍යාපනික හා වෘත්තීය අනාගතයට සාර්ථකත්වය ප්‍රාර්ථනා කරමු.`;
                    if (studentToSave.phone) {
                        smsService.sendSMS(studentToSave.phone, message, settings)
                            .then(async res => {
                                console.log("Registration SMS result:", res);
                                await supabase.from('sms_logs').insert([{
                                    recipient: studentToSave.phone,
                                    message,
                                    status: res.success ? 'sent' : 'failed'
                                }]);
                            })
                            .catch(err => console.error("SMS Send Error:", err));
                    }
                }
            } catch (smsErr) {
                console.error("Failed to trigger registration SMS:", smsErr);
            }

            return data[0];
        } catch (err) {
            console.error("Failed to add student:", err);
            throw new Error(err.message || JSON.stringify(err) || "Failed to add student");
        }
    });



    ipcMain.handle('update-student', async (event, student) => {
        const studentToSave = { ...student };
        if (Array.isArray(studentToSave.class)) {
            studentToSave.class = JSON.stringify(studentToSave.class);
        }

        const { data, error } = await supabase.from('students').update({
            name: studentToSave.name,
            dob: studentToSave.dob,
            phone: studentToSave.phone,
            email: studentToSave.email,
            class: studentToSave.class,
            enrollments: studentToSave.enrollments || null,
            guardian: studentToSave.guardian,
            guardianPhone: studentToSave.guardianPhone,
            status: studentToSave.status || 'pending',
            avatar: studentToSave.avatar,
            gender: studentToSave.gender,
            updated_at: new Date().toISOString()
        }).eq('regNum', studentToSave.regNum).select();

        if (error) throw error;
        return studentToSave;
    });

    ipcMain.handle('delete-student', async (event, regNum) => {
        await supabase.from('payments').delete().eq('regNum', regNum);
        await supabase.from('students').delete().eq('regNum', regNum);
        return regNum;
    });

    // --- IPC Handlers for Operators ---
    ipcMain.handle('get-operators', async () => {
        const { data, error } = await supabase.from('operators').select('id, name, email, role, status, lastActive, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    });

    ipcMain.handle('add-operator', async (event, operator) => {
        const { data, error } = await supabase.from('operators').insert([operator]).select();
        if (error) throw error;
        return data[0];
    });

    ipcMain.handle('delete-operator', async (event, id) => {
        await supabase.from('operators').delete().eq('id', id);
        return id;
    });

    ipcMain.handle('toggle-operator-status', async (event, { id, status }) => {
        await supabase.from('operators').update({ status }).eq('id', id);
        return { id, status };
    });

    // Auth Check (Login)
    ipcMain.handle('verify-operator', async (event, { email, password }) => {
        const { data, error } = await supabase.from('operators')
            .select('*')
            .eq('password', password)
            .or(`email.eq.${email},role.eq.${email}`)
            .single();

        return data || null;
    });

    // --- IPC Handlers for Payments ---
    ipcMain.handle('add-payment', async (event, payment) => {
        try {
            console.log("Processing payment:", payment);

            const { data, error } = await supabase.from('payments').insert([payment]).select();
            if (error) throw error;

            const info = data[0];

            // update students table updated_at
            await supabase.from('students').update({ updated_at: new Date().toISOString() }).eq('regNum', payment.regNum);

            console.log("Payment success, ID:", info.id);
            return info;
        } catch (err) {
            console.error("Error in add-payment:", err);
            throw err;
        }
    });

    ipcMain.handle('get-student-payments', async (event, regNum) => {
        const { data, error } = await supabase.from('payments').select('*').eq('regNum', regNum).order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    });

    // --- IPC Handlers for Dashboard ---
    ipcMain.handle('check-db-schema', async () => {
        // Mock schema check or return true for supabase
        return [{ name: "regNum" }, { name: "email" }];
    });

    ipcMain.handle('get-dashboard-stats', async () => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        const { count: activeStudents, error: e1 } = await supabase.from('students').select('*', { count: 'exact', head: true });

        const { data: revData, error: e2 } = await supabase.from('payments').select('amount').eq('month', currentMonth);
        const revenue = (revData || []).reduce((sum, row) => sum + Number(row.amount), 0);

        const { data: payData } = await supabase.from('payments').select('regNum').eq('month', currentMonth);
        const paidCount = new Set((payData || []).map(p => p.regNum)).size;

        const pendingPayments = (activeStudents || 0) - paidCount;

        return {
            totalStudents: activeStudents || 0,
            monthlyRevenue: revenue,
            pendingPayments: Math.max(0, pendingPayments)
        };
    });

    ipcMain.handle('get-admin-payment-stats', async () => {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const currentDate = now.toISOString().split('T')[0];

        const { data: allPay } = await supabase.from('payments').select('amount, month, date');

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let todaysRevenue = 0;

        (allPay || []).forEach(p => {
            const amt = Number(p.amount);
            totalRevenue += amt;
            if (p.month === currentMonth) monthlyRevenue += amt;
            if (p.date === currentDate) todaysRevenue += amt;
        });

        // Pending Amount Calculation
        const { data: categories } = await supabase.from('class_categories').select('name, fee');
        const categoryMap = (categories || []).reduce((acc, cat) => ({ ...acc, [cat.name]: cat.fee }), {});

        const { data: students } = await supabase.from('students').select('regNum, class');
        const { data: paymentsThisMonth } = await supabase.from('payments').select('regNum, class').eq('month', currentMonth);

        const paymentMap = {};
        (paymentsThisMonth || []).forEach(p => {
            if (!paymentMap[p.regNum]) paymentMap[p.regNum] = new Set();
            if (p.class) paymentMap[p.regNum].add(p.class);
        });

        let pendingAmount = 0;
        (students || []).forEach(s => {
            let userClasses = [];
            try { userClasses = JSON.parse(s.class); } catch (e) { userClasses = [s.class]; }
            if (!Array.isArray(userClasses)) userClasses = [s.class];

            userClasses.forEach(clsName => {
                if (!paymentMap[s.regNum]?.has(clsName)) {
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

    ipcMain.handle('get-revenue-chart', async () => {
        const { data, error } = await supabase.from('payments').select('date, amount').order('date', { ascending: false });
        if (error || !data) return [];

        const dateMap = {};
        data.forEach(p => {
            if (!dateMap[p.date]) dateMap[p.date] = 0;
            dateMap[p.date] += Number(p.amount);
        });

        const sortedDates = Object.keys(dateMap).sort().reverse().slice(0, 30);
        return sortedDates.map(date => ({ date, value: dateMap[date] })).reverse();
    });

    ipcMain.handle('get-recent-activity', async () => {
        const { data: recentStudents } = await supabase.from('students').select('regNum, name, created_at').order('created_at', { ascending: false }).limit(5);

        const { data: recentPaymentsRaw } = await supabase.from('payments').select('id, amount, created_at, regNum').order('created_at', { ascending: false }).limit(5);

        const paymentRegNums = (recentPaymentsRaw || []).map(p => p.regNum);
        const { data: payStudents } = await supabase.from('students').select('regNum, name').in('regNum', paymentRegNums.length > 0 ? paymentRegNums : ['NON_EXISTENT']);
        const payStudentMap = (payStudents || []).reduce((acc, s) => ({ ...acc, [s.regNum]: s.name }), {});

        const recentPayments = (recentPaymentsRaw || []).map(p => ({
            ...p,
            name: payStudentMap[p.regNum] || 'Unknown'
        }));

        const activities = [
            ...(recentStudents || []).map(s => ({
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

        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return activities.slice(0, 5);
    });

    ipcMain.handle('get-all-payments', async () => {
        const { data: payments } = await supabase.from('payments').select('*, students(name, class)').order('id', { ascending: false });
        return (payments || []).map(p => ({
            ...p,
            studentName: p.students?.name || 'Unknown',
            class: p.class || p.students?.class || ''
        }));
    });

    // --- IPC Handlers for Exam Results ---
    // --- IPC Handlers for Exam Results ---
    ipcMain.handle('get-upcoming-birthdays', async () => {
        const { data: students, error } = await supabase.from('students').select('regNum, name, dob, class').not('dob', 'is', null).neq('dob', '');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = (students || []).filter(s => {
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
    ipcMain.handle('get-exam-results', async (event, { className, statusFilter = 'All' }) => {
        try {
            const { data: students } = await supabase.from('students').select('regNum, name, class').ilike('class', `%${className}%`);

            const { data: results } = await supabase.from('exam_results').select('regNum, result, date').eq('class_name', className);

            const resultMap = {};
            (results || []).forEach(r => resultMap[r.regNum] = { result: r.result, date: r.date });

            let merged = (students || []).map(s => {
                const existing = resultMap[s.regNum];
                return {
                    regNum: s.regNum,
                    name: s.name,
                    className: className,
                    result: existing ? existing.result : 'None',
                    date: existing ? existing.date : new Date().toISOString().split('T')[0]
                };
            });

            if (statusFilter !== 'All') {
                merged = merged.filter(m => m.result === statusFilter);
            }

            return merged;
        } catch (error) {
            console.error("Error getting exam results:", error);
            throw error;
        }
    });

    ipcMain.handle('save-exam-results', async (event, { className, results }) => {
        try {
            const regNums = results.map(r => r.regNum);
            const { data: existing } = await supabase.from('exam_results').select('id, regNum').eq('class_name', className).in('regNum', regNums);

            const existingMap = {};
            (existing || []).forEach(e => existingMap[e.regNum] = e.id);

            const toUpdate = [];
            const toInsert = [];

            results.forEach(item => {
                if (existingMap[item.regNum]) {
                    toUpdate.push({ id: existingMap[item.regNum], regNum: item.regNum, class_name: className, result: item.result, date: item.date });
                } else {
                    toInsert.push({ regNum: item.regNum, class_name: className, result: item.result, date: item.date });
                }
            });

            const operations = [...toUpdate, ...toInsert];
            if (operations.length > 0) {
                const { error } = await supabase.from('exam_results').upsert(operations);
                if (error) throw error;
            }

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

            // --- Professional Header ---
            // Row 1: Institute Name
            const titleRowHeader = worksheet.addRow(['SL Dream Japan']);
            titleRowHeader.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FFFF0000' } }; // Brand Red
            worksheet.mergeCells('A1:G1');
            titleRowHeader.alignment = { horizontal: 'center' };

            // Row 2: Subtitle / Report Name
            const subtitleRow = worksheet.addRow([`Exam Results Report - ${className}`]);
            subtitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF333333' } };
            worksheet.mergeCells('A2:G2');
            subtitleRow.alignment = { horizontal: 'center' };

            // Row 3: Generation Date
            const dateRow = worksheet.addRow([`Generated on: ${new Date().toLocaleDateString()}`]);
            dateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
            worksheet.mergeCells('A3:G3');
            dateRow.alignment = { horizontal: 'center' };

            // Row 4: Empty space separator
            worksheet.addRow([]);

            // Define columns (starting at Row 5)
            worksheet.getRow(5).values = [
                'Student ID', 'Student Name', 'Course', 'Duration', 'Start Date', 'End Date', 'Result'
            ];

            // Set Column Widths and Keys for standard rows
            worksheet.columns = [
                { key: 'regNum', width: 15 },
                { key: 'name', width: 30 },
                { key: 'course', width: 20 },
                { key: 'duration', width: 25 },
                { key: 'startDate', width: 15 },
                { key: 'endDate', width: 15 },
                { key: 'result', width: 15 }
            ];

            // Add rows
            data.forEach(item => {
                worksheet.addRow({
                    regNum: item.regNum,
                    name: item.name,
                    course: className,
                    duration: duration,
                    startDate: item.startDate || 'Not Set',
                    endDate: item.endDate || 'Not Set',
                    result: item.result
                });
            });

            // Style data header (Row 5)
            const headerRow = worksheet.getRow(5);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0D9488' } // Teal branding
                };
            });

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
    ipcMain.handle('get-class-categories', async () => {
        const { data } = await supabase.from('class_categories').select('*').order('created_at', { ascending: true });
        return data || [];
    });

    ipcMain.handle('add-class-category', async (event, category) => {
        const toSave = { ...category, duration: category.duration || '3 months' };
        const { data, error } = await supabase.from('class_categories').insert([toSave]).select();
        if (error) throw error;
        return data[0];
    });

    ipcMain.handle('update-class-category', async (event, category) => {
        const toSave = { ...category, duration: category.duration || '3 months' };
        await supabase.from('class_categories').update({ name: toSave.name, fee: toSave.fee, duration: toSave.duration }).eq('id', category.id);
        return toSave;
    });

    ipcMain.handle('delete-class-category', async (event, id) => {
        await supabase.from('class_categories').delete().eq('id', id);
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
            await supabase.from('sms_logs').insert([{
                recipient: targetPhone, message: message, status: res.success ? 'sent' : 'failed'
            }]);

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
                await supabase.from('sms_logs').insert([{
                    recipient: phone, message: message, status: res.success ? 'sent' : 'failed'
                }]);
                if (res.success) successCount++; else failCount++;
            } catch (e) {
                console.error(`Failed to send to ${phone} `, e);
                failCount++;
                await supabase.from('sms_logs').insert([{
                    recipient: phone, message: message, status: 'error'
                }]);
            }
        }
        return { successCount, failCount };
    });

    ipcMain.handle('get-sms-logs', async () => {
        const { data, error } = await supabase.from('sms_logs').select('*').order('sent_at', { ascending: false }).limit(5);
        if (error) console.error("Error fetching SMS logs:", error);
        return data || [];
    });

    // --- IPC Handlers for General Finance ---
    ipcMain.handle('get-finance-records', async (event, { startDate, endDate, type }) => {
        let query = supabase.from('finance_records').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (type && type !== 'all') query = query.eq('type', type);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    });

    ipcMain.handle('add-finance-record', async (event, record) => {
        const { data, error } = await supabase.from('finance_records').insert([record]).select();
        if (error) throw error;
        return data[0];
    });

    ipcMain.handle('delete-finance-record', async (event, id) => {
        await supabase.from('finance_records').delete().eq('id', id);
        return id;
    });

    ipcMain.handle('get-finance-summary', async (event, { startDate, endDate }) => {
        let finQuery = supabase.from('finance_records').select('type, amount');
        if (startDate) finQuery = finQuery.gte('date', startDate);
        if (endDate) finQuery = finQuery.lte('date', endDate);
        const { data: financeStats } = await finQuery;

        let payQuery = supabase.from('payments').select('amount');
        if (startDate) payQuery = payQuery.gte('date', startDate);
        if (endDate) payQuery = payQuery.lte('date', endDate);
        const { data: payData } = await payQuery;

        const studentRevenue = (payData || []).reduce((sum, row) => sum + Number(row.amount), 0);

        let extraIncome = 0;
        let totalExpense = 0;

        (financeStats || []).forEach(s => {
            if (s.type === 'income') extraIncome += Number(s.amount);
            else if (s.type === 'expense') totalExpense += Number(s.amount);
        });

        return {
            studentRevenue,
            extraIncome,
            totalIncome: studentRevenue + extraIncome,
            totalExpense,
            netProfit: (studentRevenue + extraIncome) - totalExpense
        };
    });

    ipcMain.handle('get-finance-categories', async (event, type) => {
        let query = supabase.from('finance_categories').select('*').order('name', { ascending: true });
        if (type) query = query.eq('type', type);
        const { data } = await query;
        return data || [];
    });
    ipcMain.handle('export-students', async (event, students) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Student Directory');

            // --- Professional Header ---
            const titleRowHeader = worksheet.addRow(['SL Dream Japan']);
            titleRowHeader.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FF053452' } };
            worksheet.mergeCells('A1:F1');
            titleRowHeader.alignment = { horizontal: 'center' };

            const subtitleRow = worksheet.addRow([`Student Directory Export`]);
            subtitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF333333' } };
            worksheet.mergeCells('A2:F2');
            subtitleRow.alignment = { horizontal: 'center' };

            const dateRow = worksheet.addRow([`Generated on: ${new Date().toLocaleDateString()}`]);
            dateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
            worksheet.mergeCells('A3:F3');
            dateRow.alignment = { horizontal: 'center' };

            worksheet.addRow([]);

            worksheet.getRow(5).values = ['Reg Number', 'Name', 'Phone', 'Email', 'Classes', 'Status'];

            worksheet.columns = [
                { key: 'regNum', width: 20 },
                { key: 'name', width: 30 },
                { key: 'phone', width: 20 },
                { key: 'email', width: 30 },
                { key: 'classes', width: 40 },
                { key: 'status', width: 15 }
            ];

            students.forEach(student => {
                let classString = '';
                if (student.classStatuses) {
                    classString = student.classStatuses.map(c => `${c.className} (${c.status})`).join(', ');
                } else if (Array.isArray(student.class)) {
                    classString = student.class.join(', ');
                } else {
                    classString = student.class;
                }

                const row = worksheet.addRow({
                    regNum: student.regNum,
                    name: student.name,
                    phone: student.phone || '-',
                    email: student.email || '-',
                    classes: classString,
                    status: (student.status || '').toUpperCase()
                });

                const statusCell = row.getCell(6);
                if (student.status === 'paid') {
                    statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
                } else if (student.status === 'overdue') {
                    statusCell.font = { color: { argb: 'FFDC2626' }, bold: true };
                } else {
                    statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
                }
            });

            const headerRow = worksheet.getRow(5);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF053452' } };
            });

            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Student Directory',
                defaultPath: `Student_Directory_${new Date().toISOString().split('T')[0]}.xlsx`,
                filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
            });

            if (filePath) {
                await workbook.xlsx.writeFile(filePath);
                return { success: true, path: filePath };
            } else {
                return { success: false, cancelled: true };
            }
        } catch (error) {
            console.error("Error exporting students:", error);
            throw error;
        }
    });

    ipcMain.handle('export-finance-records', async (event, { startDate, endDate, type, data }) => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Finance Report');

            // --- Professional Header ---
            const titleRowHeader = worksheet.addRow(['SL Dream Japan']);
            titleRowHeader.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FFFF0000' } };
            worksheet.mergeCells('A1:E1');
            titleRowHeader.alignment = { horizontal: 'center' };

            const timeRangeStr = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';
            const typeStr = type === 'income' ? 'Income Only' : (type === 'expense' ? 'Expenses Only' : 'All Transactions');

            const subtitleRow = worksheet.addRow([`Finance Report - ${typeStr} (${timeRangeStr})`]);
            subtitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF333333' } };
            worksheet.mergeCells('A2:E2');
            subtitleRow.alignment = { horizontal: 'center' };

            const dateRow = worksheet.addRow([`Generated on: ${new Date().toLocaleDateString()}`]);
            dateRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
            worksheet.mergeCells('A3:E3');
            dateRow.alignment = { horizontal: 'center' };

            worksheet.addRow([]);

            worksheet.getRow(5).values = ['Date', 'Type', 'Category', 'Description', 'Amount (LKR)'];

            worksheet.columns = [
                { key: 'date', width: 15 },
                { key: 'type', width: 15 },
                { key: 'category', width: 25 },
                { key: 'description', width: 40 },
                { key: 'amount', width: 15 }
            ];

            data.forEach(item => {
                const row = worksheet.addRow({
                    date: item.date,
                    type: item.type === 'income' ? 'Income' : 'Expense',
                    category: item.category,
                    description: item.description || '-',
                    amount: item.amount
                });

                // Style the 'amount' cell (Column 5 / E)
                const amountCell = row.getCell(5);
                if (item.type === 'income') {
                    amountCell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
                    amountCell.numFmt = '"+"#,##0.00';
                } else {
                    amountCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
                    amountCell.numFmt = '"-"#,##0.00';
                }
            });

            const headerRow = worksheet.getRow(5);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
            });

            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Finance Report',
                defaultPath: `Finance_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
                filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
            });

            if (filePath) {
                await workbook.xlsx.writeFile(filePath);
                return { success: true, path: filePath };
            } else {
                return { success: false, cancelled: true };
            }
        } catch (error) {
            console.error("Error exporting finance records:", error);
            throw error;
        }
    });


    ipcMain.handle('add-finance-category', async (event, { type, name }) => {
        try {
            const { data, error } = await supabase.from('finance_categories').insert([{ type, name }]).select();
            if (error) throw error;
            return data[0];
        } catch (err) {
            console.error("Failed to add finance category:", err);
            throw err;
        }
    });

    ipcMain.handle('delete-finance-category', async (event, id) => {
        const { data: cat } = await supabase.from('finance_categories').select('name').eq('id', id).single();
        if (cat) {
            await supabase.from('finance_records').delete().eq('category', cat.name);
        }
        await supabase.from('finance_categories').delete().eq('id', id);
        return id;
    });

    ipcMain.handle('send-welcome-sms', async (event, { phone, message }) => {
        try {
            const settings = loadSmsConfig();
            if (!settings || !settings.enabled) {
                console.log("[SMS] Text messaging is disabled in settings. Skipping welcome message.");
                return { success: false, message: "SMS is disabled in settings." };
            }

            console.log(`[SMS] Sending welcome message to ${phone}...`);
            const res = await smsService.sendSMS(phone, message, settings);

            // Log it in Supabase
            await supabase.from('sms_logs').insert([{
                recipient: phone,
                message: message,
                status: res.success ? 'sent' : 'failed'
            }]);

            return res;
        } catch (error) {
            console.error("Failed to send welcome SMS:", error);

            // Still try to log the failure
            try {
                await supabase.from('sms_logs').insert([{
                    recipient: phone,
                    message: message,
                    status: 'failed'
                }]);
            } catch (e) { }

            throw new Error(error.message || "Failed to send SMS");
        }
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
        const { data: payments } = await supabase.from('payments').select('regNum, class').eq('month', currentMonth);
        const paidMap = {};
        (payments || []).forEach(p => {
            if (!paidMap[p.regNum]) paidMap[p.regNum] = new Set();
            if (p.class) paidMap[p.regNum].add(p.class);
        });

        const { data: students } = await supabase.from('students').select('regNum, phone, name, class');
        let sentCount = 0;
        let failCount = 0;

        for (const s of (students || [])) {
            if (!s.phone) continue;

            let classes = [];
            try { classes = JSON.parse(s.class); } catch (e) { classes = [s.class]; }
            if (!Array.isArray(classes)) classes = [s.class];

            const pendingClasses = classes.filter(cls => !paidMap[s.regNum]?.has(cls));

            if (pendingClasses.length > 0) {
                const message = `[${currentMonth}] සඳහා [${pendingClasses.join(', ')}] ගෙවීම තවමත් සිදු කර නොමැත. කරුණාකර මෙම මස 10 වන දිනට පෙර ගෙවීමට කටයුතු කරන්න.\n- SL Dream Japan`;

                try {
                    const res = await smsService.sendSMS(s.phone, message, settings);
                    console.log(`Reminder sent to ${s.name} (${s.phone}): ${res.success}`);

                    await supabase.from('sms_logs').insert([{
                        recipient: s.phone, message, status: res.success ? 'sent' : 'failed'
                    }]);

                    if (res.success) sentCount++; else failCount++;
                } catch (e) {
                    console.error(`Failed to send reminder to ${s.phone}`, e);
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
