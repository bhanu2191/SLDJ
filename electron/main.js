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

const dbPath = join(app.getPath('userData'), 'school.db');
// Ensure directory exists if needed, but app.getPath('userData') usually exists.
const db = new Database(dbPath);

// Note: Schema Changed. User must delete old DB.
function createTable() {
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
}

createTable();

let mainWindow = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
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

    // IPC Handlers
    ipcMain.handle('get-students', () => {
        const stmt = db.prepare('SELECT * FROM students ORDER BY created_at DESC');
        return stmt.all();
    });

    ipcMain.handle('add-student', (event, student) => {
        // Use regNum as the "id" effectively
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

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
