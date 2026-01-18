
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(process.cwd(), 'data', 'school.db');
const outputPath = path.resolve(process.cwd(), 'data', 'database_export.json');

console.log(`Current Working Directory: ${process.cwd()}`);
console.log(`Target Database Path: ${dbPath}`);
console.log(`Output Path: ${outputPath}`);

try {
    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}`);
    }
    const db = new Database(dbPath);

    // Get all table names
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    const exportData = {};

    console.log(`Found ${tables.length} tables. Exporting...`);

    for (const table of tables) {
        const tableName = table.name;
        console.log(`- Exporting table: ${tableName}`);
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        exportData[tableName] = rows;
    }

    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`\nSuccess! Database exported to: ${outputPath}`);
    db.close();

} catch (error) {
    console.error('Error exporting database:', error);
    fs.writeFileSync(path.resolve(process.cwd(), 'export_error.log'), error.toString() + '\n' + JSON.stringify(error, null, 2));
}
