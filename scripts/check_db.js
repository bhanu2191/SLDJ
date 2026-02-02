const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/school.db');
const db = new Database(dbPath);

const info = db.pragma('table_info(students)');
console.log(info);

const student = db.prepare('SELECT regNum, name, gender FROM students ORDER BY created_at DESC LIMIT 1').get();
console.log('Last Student:', student);
