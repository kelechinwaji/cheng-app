const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'ledger.sqlite');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function openDb() {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gmail_history_id TEXT,
      last_synced_at TEXT,
      last_error TEXT
    );

    INSERT OR IGNORE INTO sync_state (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      opening_balance REAL NOT NULL DEFAULT 0,
      opening_balance_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
      amount REAL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      description TEXT,
      category TEXT,
      occurred_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'posted'
        CHECK (status IN ('posted', 'pending_review', 'void')),
      source TEXT NOT NULL DEFAULT 'email',
      gmail_message_id TEXT UNIQUE,
      bank_key TEXT,
      parse_confidence REAL,
      raw_snippet TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_occurred ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  `);

  const accountCount = db.prepare('SELECT COUNT(*) as c FROM accounts').get().c;
  if (accountCount === 0) {
    db.prepare(
      `INSERT INTO accounts (name, currency, opening_balance, opening_balance_at)
       VALUES (@name, @currency, @opening_balance, @opening_balance_at)`
    ).run({
      name: 'Main',
      currency: process.env.DEFAULT_CURRENCY || 'NGN',
      opening_balance: Number(process.env.OPENING_BALANCE || 0),
      opening_balance_at: process.env.OPENING_BALANCE_AT || null,
    });
  }
}

let _db;
function getDb() {
  if (!_db) {
    _db = openDb();
    migrate(_db);
  }
  return _db;
}

function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, String(value));
}

module.exports = {
  getDb,
  DB_PATH,
  getSetting,
  setSetting,
};
