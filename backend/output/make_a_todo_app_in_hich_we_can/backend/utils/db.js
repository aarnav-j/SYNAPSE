const sqlite3 = require('better-sqlite3');
const db = sqlite3('todo.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  );
`);

module.exports = db;