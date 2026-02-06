const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, {});

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

const initDb = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            currency TEXT DEFAULT 'USD',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            market_date TEXT NOT NULL,
            cash REAL DEFAULT 0,
            investments REAL DEFAULT 0,
            debt REAL DEFAULT 0,
            debt_interest_rate REAL DEFAULT 0,
            income REAL DEFAULT 0,
            expenses REAL DEFAULT 0,
            risk_level TEXT DEFAULT 'moderate',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, market_date),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS advice_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            snapshot_id INTEGER NOT NULL,
            financial_status TEXT,
            risk_level TEXT,
            liquidity_label TEXT,
            summary TEXT,
            key_insights TEXT,
            actionable_steps TEXT,
            raw_response TEXT,
            model_used TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(snapshot_id) REFERENCES snapshots(id)
        );
    `);

    // Migrate: add new columns if they don't exist
    const cols = db.prepare("PRAGMA table_info(snapshots)").all().map(c => c.name);
    if (!cols.includes('debt_interest_rate')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN debt_interest_rate REAL DEFAULT 0");
        console.log('[db] Added debt_interest_rate column.');
    }
    if (!cols.includes('risk_level')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN risk_level TEXT DEFAULT 'moderate'");
        console.log('[db] Added risk_level column.');
    }

    // Ensure default user exists
    const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!user) {
        db.prepare('INSERT INTO users (id) VALUES (1)').run();
        console.log('[db] Default user (ID: 1) created.');
    }
};

// --- Computed metrics (pure functions, no DB) ---

const computeMetrics = (snap) => {
    const cash = Number(snap.cash) || 0;
    const investments = Number(snap.investments) || 0;
    const debt = Number(snap.debt) || 0;
    const income = Number(snap.income) || 0;
    const expenses = Number(snap.expenses) || 0;

    const netWorth = cash + investments - debt;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;
    const runwayMonths = expenses > 0 ? cash / expenses : 0;
    const cashDebtRatio = debt > 0 ? cash / debt : -1; // -1 = debt-free
    const debtToAsset = (cash + investments) > 0 ? debt / (cash + investments) : 0;
    const investmentRatio = (cash + investments) > 0 ? investments / (cash + investments) : 0;

    return {
        netWorth: Math.round(netWorth * 100) / 100,
        surplus: Math.round(surplus * 100) / 100,
        savingsRate: Math.round(savingsRate * 10000) / 10000,
        runwayMonths: Math.round(runwayMonths * 10) / 10,
        cashDebtRatio: cashDebtRatio === -1 ? -1 : Math.round(cashDebtRatio * 100) / 100,
        debtToAsset: Math.round(debtToAsset * 10000) / 10000,
        investmentRatio: Math.round(investmentRatio * 10000) / 10000,
    };
};

// --- Snapshot CRUD ---

const upsertSnapshot = (data) => {
    const { user_id, market_date, cash, investments, debt, debt_interest_rate, income, expenses, risk_level } = data;
    const stmt = db.prepare(`
        INSERT INTO snapshots (user_id, market_date, cash, investments, debt, debt_interest_rate, income, expenses, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, market_date) DO UPDATE SET
            cash = excluded.cash,
            investments = excluded.investments,
            debt = excluded.debt,
            debt_interest_rate = excluded.debt_interest_rate,
            income = excluded.income,
            expenses = excluded.expenses,
            risk_level = excluded.risk_level,
            created_at = CURRENT_TIMESTAMP
    `);
    const info = stmt.run(user_id, market_date,
        Number(cash) || 0, Number(investments) || 0, Number(debt) || 0,
        Number(debt_interest_rate) || 0, Number(income) || 0, Number(expenses) || 0,
        risk_level || 'moderate'
    );
    // Return the row (could be insert or update)
    return db.prepare('SELECT * FROM snapshots WHERE user_id = ? AND market_date = ?').get(user_id, market_date);
};

const getSnapshots = (user_id) => {
    return db.prepare('SELECT * FROM snapshots WHERE user_id = ? ORDER BY market_date DESC').all(user_id);
};

const getLatestSnapshot = (user_id) => {
    return db.prepare('SELECT * FROM snapshots WHERE user_id = ? ORDER BY market_date DESC LIMIT 1').get(user_id);
};

const getSnapshotById = (id, user_id) => {
    return db.prepare('SELECT * FROM snapshots WHERE id = ? AND user_id = ?').get(id, user_id);
};

// --- Advice CRUD ---

const saveAdvice = (data) => {
    const {
        user_id, snapshot_id, financial_status, risk_level, liquidity_label,
        summary, key_insights, actionable_steps, raw_response, model_used
    } = data;
    const stmt = db.prepare(`
        INSERT INTO advice_history
            (user_id, snapshot_id, financial_status, risk_level, liquidity_label,
             summary, key_insights, actionable_steps, raw_response, model_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
        user_id, snapshot_id, financial_status, risk_level, liquidity_label,
        summary,
        JSON.stringify(key_insights),
        JSON.stringify(actionable_steps),
        raw_response, model_used
    );
    return info.lastInsertRowid;
};

const getAdviceForSnapshot = (snapshot_id) => {
    const row = db.prepare('SELECT * FROM advice_history WHERE snapshot_id = ? ORDER BY created_at DESC LIMIT 1').get(snapshot_id);
    if (!row) return null;
    // Parse JSON arrays back
    try { row.key_insights = JSON.parse(row.key_insights); } catch { row.key_insights = []; }
    try { row.actionable_steps = JSON.parse(row.actionable_steps); } catch { row.actionable_steps = []; }
    return row;
};

module.exports = {
    db,
    initDb,
    computeMetrics,
    upsertSnapshot,
    getSnapshots,
    getLatestSnapshot,
    getSnapshotById,
    saveAdvice,
    getAdviceForSnapshot,
};
