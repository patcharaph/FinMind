import Database from "better-sqlite3";

export const initDb = (dbPath = "database.sqlite") => {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cash REAL NOT NULL,
      debt REAL NOT NULL,
      investment REAL NOT NULL,
      income REAL NOT NULL,
      expense REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS advice_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      snapshot_id INTEGER NOT NULL,
      advice_text TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
    );
  `);

  return db;
};
