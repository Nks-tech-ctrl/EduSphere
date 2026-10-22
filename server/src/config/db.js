const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'edusphere.db');

let dbInstance = null;
let dbType = '';

// Check for Node.js built-in node:sqlite first (Node 22+, zero native compilation)
try {
  const { DatabaseSync } = require('node:sqlite');
  const nDb = new DatabaseSync(dbPath);
  nDb.exec('PRAGMA journal_mode = WAL;');
  nDb.exec('PRAGMA foreign_keys = ON;');

  dbInstance = {
    exec: (sql) => nDb.exec(sql),
    prepare: (sql) => {
      const stmt = nDb.prepare(sql);
      return {
        all: (...params) => stmt.all(...params),
        get: (...params) => stmt.get(...params),
        run: (...params) => {
          const res = stmt.run(...params);
          return {
            changes: Number(res.changes),
            lastInsertRowid: Number(res.lastInsertRowid)
          };
        }
      };
    },
    transaction: (fn) => {
      return (...args) => {
        nDb.exec('BEGIN TRANSACTION;');
        try {
          const result = fn(...args);
          nDb.exec('COMMIT;');
          return result;
        } catch (e) {
          nDb.exec('ROLLBACK;');
          throw e;
        }
      };
    },
    close: () => nDb.close()
  };
  dbType = 'node:sqlite (built-in, zero-dependency)';
} catch (builtinErr) {
  // If running on an older Node version without node:sqlite, try better-sqlite3
  try {
    const Database = require('better-sqlite3');
    const bDb = new Database(dbPath);
    bDb.pragma('journal_mode = WAL');
    bDb.pragma('foreign_keys = ON');

    dbInstance = {
      exec: (sql) => bDb.exec(sql),
      prepare: (sql) => {
        const stmt = bDb.prepare(sql);
        return {
          all: (...params) => stmt.all(...params),
          get: (...params) => stmt.get(...params),
          run: (...params) => {
            const res = stmt.run(...params);
            return {
              changes: Number(res.changes),
              lastInsertRowid: Number(res.lastInsertRowid)
            };
          }
        };
      },
      transaction: (fn) => bDb.transaction(fn),
      close: () => bDb.close()
    };
    dbType = 'better-sqlite3';
  } catch (err) {
    console.error('Fatal: Failed to initialize SQLite adapter:', err);
    throw err;
  }
}

console.log(`[Edusphere DB] Initialized SQLite database at ${dbPath} using [${dbType}]`);

module.exports = dbInstance;
