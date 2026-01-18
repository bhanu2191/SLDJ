import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(process.cwd(), 'data', 'school.db');
const inputPath = path.resolve(process.cwd(), 'data', 'database_export.json');

console.log(`Checking for import file at: ${inputPath}`);

if (!fs.existsSync(inputPath)) {
    console.error('Export file not found at:', inputPath);
    process.exit(1);
}

// Ensure database exists (or is created)
console.log(`Connecting to database at: ${dbPath}`);
// Ensure directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Initialize Database Schema (Copied from main.js to ensure tables exist)
function initDB() {
    console.log('Initializing database schema...');
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

    // Migration for students table columns (guardian, guardianPhone, avatar)
    const studentCols = ['guardian', 'guardianPhone', 'avatar', 'email', 'dob', 'phone'];
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
            enabled INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

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
    console.log('Database schema initialized.');
}

initDB();

console.log('Starting import...');

const importTransaction = db.transaction(() => {
    for (const [tableName, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) {
            console.log(`Skipping table ${tableName} (no data)`);
            continue;
        }

        console.log(`Importing ${rows.length} rows into table: ${tableName}`);

        // We assume the first row has all the keys we need. 
        // If the table doesn't exist, this will fail. We assume tables are created by main.js logic (running the app once).
        // Alternatively we could try to create them, but better to rely on app logic.

        const firstRow = rows[0];
        const columns = Object.keys(firstRow);

        // Prepare statement - INSERT OR REPLACE to overwrite existing IDs/keys
        const columnNames = columns.join(', ');
        const valuePlaceholders = columns.map(() => '?').join(', ');

        const stmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`);

        for (const row of rows) {
            const values = columns.map(col => row[col]);
            stmt.run(...values);
        }
    }
});

try {
    importTransaction();
    console.log('Import completed successfully!');
} catch (error) {
    console.error('Import failed:', error);
    // If table doesn't exist error, user might need to run app once first
    if (error.message && error.message.includes('no such table')) {
        console.error('\nNOTE: It seems some tables do not exist. Please run the application once ("npm run electron:dev") to initialize the database schema, then run this import script again.');
    }
} finally {
    db.close();
    process.exit(0);
}
