import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Connection
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Missing Supabase URL or Key in .env file.");
    console.error("Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Local SQLite Connection
const getDbPath = () => {
    // Manually construct the path to the AppData roaming directory
    const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
    return join(appDataPath, 'sl-dream-japan-app', 'data', 'school.db');
};

const dbPath = getDbPath();
if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Could not find local SQLite database at ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
console.log(`✅ Connected to local DB: ${dbPath}`);
console.log(`✅ Connected to Supabase: ${supabaseUrl}`);

async function migrateTable(tableName) {
    console.log(`\n⏳ Migrating table: ${tableName}...`);

    // Read local data
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`   Found ${rows.length} rows in local SQLite.`);

    if (rows.length === 0) {
        console.log(`   Skipping empty table.`);
        return;
    }

    // Supabase expects ISO dates or proper nulls, and doesn't like auto-increment IDs to be forced if possible,
    // but we want to retain relationships (like regNum, student IDs, payment IDs).

    // Process rows to ensure compatibility (e.g., SQLite might have stored 'null' as string or empty strings)
    const processedRows = rows.map(row => {
        const newRow = { ...row };
        // Basic cleanup if needed
        return newRow;
    });

    // Insert into Supabase in chunks to avoid overwhelming the API
    const chunkSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < processedRows.length; i += chunkSize) {
        const chunk = processedRows.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from(tableName)
            .upsert(chunk, { onConflict: tableName === 'students' ? 'regNum' : 'id' })
            // the onConflict assumes students uses regNum as PK, others mostly use 'id'
            .select();

        if (error) {
            console.error(`   ❌ Error inserting chunk into ${tableName}:`, error.message);
            errorCount += chunk.length;
        } else {
            successCount += chunk.length;
        }
    }

    console.log(`   ✅ Finished ${tableName}. Success: ${successCount}. Errors: ${errorCount}.`);
}

async function runMigration() {
    console.log("\n🚀 Starting Database Migration to Supabase...\n");

    try {
        // Order matters due to foreign key relationships
        await migrateTable('students');
        await migrateTable('operators');
        await migrateTable('class_categories');
        await migrateTable('finance_categories');

        await migrateTable('payments');
        await migrateTable('finance_records');
        await migrateTable('exam_results');

        await migrateTable('sms_settings');
        await migrateTable('sms_logs');

        console.log("\n🎉 All migrations completed!");

    } catch (err) {
        console.error("❌ Fatal Error during migration:", err);
    } finally {
        db.close();
    }
}

runMigration();
