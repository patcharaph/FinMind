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
            -- Assets
            cash_savings REAL DEFAULT 0,
            investments REAL DEFAULT 0,
            personal_assets REAL DEFAULT 0,
            other_assets REAL DEFAULT 0,
            -- Liabilities
            short_term_debt REAL DEFAULT 0,
            long_term_debt REAL DEFAULT 0,
            debt_interest_rate REAL DEFAULT 0,
            -- Income/Expenses
            income REAL DEFAULT 0,
            expenses REAL DEFAULT 0,
            -- Settings
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

    db.exec(`
        CREATE TABLE IF NOT EXISTS ai_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            usage_date TEXT NOT NULL,
            request_count INTEGER DEFAULT 0,
            UNIQUE(user_id, usage_date),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    // Migrate: add new columns if they don't exist
    const cols = db.prepare("PRAGMA table_info(snapshots)").all().map(c => c.name);
    
    // New asset/liability columns (v2)
    if (!cols.includes('cash_savings')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN cash_savings REAL DEFAULT 0");
        // Migrate old 'cash' data to 'cash_savings' if exists
        if (cols.includes('cash')) {
            db.exec("UPDATE snapshots SET cash_savings = cash WHERE cash_savings = 0 AND cash > 0");
        }
        console.log('[db] Added cash_savings column.');
    }
    if (!cols.includes('personal_assets')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN personal_assets REAL DEFAULT 0");
        console.log('[db] Added personal_assets column.');
    }
    if (!cols.includes('other_assets')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN other_assets REAL DEFAULT 0");
        console.log('[db] Added other_assets column.');
    }
    if (!cols.includes('short_term_debt')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN short_term_debt REAL DEFAULT 0");
        // Migrate old 'debt' data to 'short_term_debt' if exists
        if (cols.includes('debt')) {
            db.exec("UPDATE snapshots SET short_term_debt = debt WHERE short_term_debt = 0 AND debt > 0");
        }
        console.log('[db] Added short_term_debt column.');
    }
    if (!cols.includes('long_term_debt')) {
        db.exec("ALTER TABLE snapshots ADD COLUMN long_term_debt REAL DEFAULT 0");
        console.log('[db] Added long_term_debt column.');
    }
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
    // Assets (support both old and new field names)
    const cashSavings = Number(snap.cash_savings) || Number(snap.cash) || 0;
    const investments = Number(snap.investments) || 0;
    const personalAssets = Number(snap.personal_assets) || 0;
    const otherAssets = Number(snap.other_assets) || 0;
    
    // Liabilities (support both old and new field names)
    const shortTermDebt = Number(snap.short_term_debt) || Number(snap.debt) || 0;
    const longTermDebt = Number(snap.long_term_debt) || 0;
    
    // Income/Expenses
    const income = Number(snap.income) || 0;
    const expenses = Number(snap.expenses) || 0;

    // Calculated values
    const totalAssets = cashSavings + investments + personalAssets + otherAssets;
    const liquidAssets = cashSavings + investments; // Easily accessible
    const totalDebt = shortTermDebt + longTermDebt;
    const netWorth = totalAssets - totalDebt;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;
    const runwayMonths = expenses > 0 ? cashSavings / expenses : 0;
    const cashDebtRatio = totalDebt > 0 ? cashSavings / totalDebt : -1; // -1 = debt-free
    const debtToAsset = totalAssets > 0 ? totalDebt / totalAssets : 0;
    const investmentRatio = liquidAssets > 0 ? investments / liquidAssets : 0;
    const liquidityRatio = shortTermDebt > 0 ? liquidAssets / shortTermDebt : -1; // -1 = no short-term debt

    return {
        // Totals
        totalAssets: Math.round(totalAssets * 100) / 100,
        liquidAssets: Math.round(liquidAssets * 100) / 100,
        totalDebt: Math.round(totalDebt * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
        // Cash flow
        surplus: Math.round(surplus * 100) / 100,
        savingsRate: Math.round(savingsRate * 10000) / 10000,
        // Ratios
        runwayMonths: Math.round(runwayMonths * 10) / 10,
        cashDebtRatio: cashDebtRatio === -1 ? -1 : Math.round(cashDebtRatio * 100) / 100,
        debtToAsset: Math.round(debtToAsset * 10000) / 10000,
        investmentRatio: Math.round(investmentRatio * 10000) / 10000,
        liquidityRatio: liquidityRatio === -1 ? -1 : Math.round(liquidityRatio * 100) / 100,
    };
};

// --- Snapshot CRUD ---

const upsertSnapshot = (data) => {
    const { 
        user_id, market_date, 
        cash_savings, investments, personal_assets, other_assets,
        short_term_debt, long_term_debt, debt_interest_rate,
        income, expenses, risk_level 
    } = data;
    const stmt = db.prepare(`
        INSERT INTO snapshots (user_id, market_date, cash_savings, investments, personal_assets, other_assets, short_term_debt, long_term_debt, debt_interest_rate, income, expenses, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, market_date) DO UPDATE SET
            cash_savings = excluded.cash_savings,
            investments = excluded.investments,
            personal_assets = excluded.personal_assets,
            other_assets = excluded.other_assets,
            short_term_debt = excluded.short_term_debt,
            long_term_debt = excluded.long_term_debt,
            debt_interest_rate = excluded.debt_interest_rate,
            income = excluded.income,
            expenses = excluded.expenses,
            risk_level = excluded.risk_level,
            created_at = CURRENT_TIMESTAMP
    `);
    const info = stmt.run(user_id, market_date,
        Number(cash_savings) || 0, Number(investments) || 0, Number(personal_assets) || 0, Number(other_assets) || 0,
        Number(short_term_debt) || 0, Number(long_term_debt) || 0, Number(debt_interest_rate) || 0,
        Number(income) || 0, Number(expenses) || 0,
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

// --- AI Usage Tracking (Beta limits) ---

const AI_DAILY_LIMIT = 3;

const getAiUsageToday = (user_id) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const row = db.prepare('SELECT request_count FROM ai_usage WHERE user_id = ? AND usage_date = ?').get(user_id, today);
    return row ? row.request_count : 0;
};

const incrementAiUsage = (user_id) => {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
        INSERT INTO ai_usage (user_id, usage_date, request_count)
        VALUES (?, ?, 1)
        ON CONFLICT(user_id, usage_date) DO UPDATE SET request_count = request_count + 1
    `).run(user_id, today);
};

const canUseAi = (user_id) => {
    return getAiUsageToday(user_id) < AI_DAILY_LIMIT;
};

const getAiUsageInfo = (user_id) => {
    const used = getAiUsageToday(user_id);
    return { used, limit: AI_DAILY_LIMIT, remaining: Math.max(0, AI_DAILY_LIMIT - used) };
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
    getAiUsageToday,
    incrementAiUsage,
    canUseAi,
    getAiUsageInfo,
    AI_DAILY_LIMIT,
};
