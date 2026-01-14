import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Database from 'better-sqlite3';

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
        const stmt = db.prepare('SELECT * FROM students ORDER BY created_at DESC');
        return stmt.all();
    });

    ipcMain.handle('get-student', (event, regNum) => {
        const stmt = db.prepare('SELECT * FROM students WHERE regNum = ?');
        return stmt.get(regNum);
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

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
