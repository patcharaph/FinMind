// FinMind backend scaffold: Node + Express + Postgres (optional)
// - If DATABASE_URL is set, data persists in Postgres (tables auto-created).
// - If not, falls back to in-memory storage (good for local prototyping).

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;
const allowOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || ["*"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowOrigins.includes("*") || allowOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(express.static(__dirname));
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- DB setup (optional) ---
const useDb = !!process.env.DATABASE_URL;
const pool = useDb
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    })
  : null;

async function initDb() {
  if (!useDb) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      display_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      tag TEXT,
      value NUMERIC NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS liabilities (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      tag TEXT,
      value NUMERIC NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT,
      type TEXT CHECK (type IN ('income','expense')) NOT NULL,
      amount NUMERIC NOT NULL,
      occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await pool.query(ddl);
}

// --- In-memory fallback ---
const memory = {
  user: { id: 1, email: "demo@finmind.ai", display_name: "Demo User" },
  assets: [
    { id: 1, name: "Crypto Portfolio", value: 42000, tag: "DeFi", user_id: 1 },
    { id: 2, name: "Cash Reserve", value: 15000, tag: "Cash", user_id: 1 },
    { id: 3, name: "Index Fund", value: 18000, tag: "ETF", user_id: 1 },
  ],
  liabilities: [
    { id: 1, name: "Car Loan", value: 12000, tag: "Auto", user_id: 1 },
    { id: 2, name: "Credit Card", value: 3500, tag: "Revolving", user_id: 1 },
    { id: 3, name: "Student Loan", value: 24000, tag: "Education", user_id: 1 },
  ],
  transactions: [
    { id: 1, title: "Salary Deposit", amount: 5200, type: "income", category: "Salary", occurred_on: "2024-04-01", user_id: 1 },
    { id: 2, title: "Food Expense", amount: -320, type: "expense", category: "Dining", occurred_on: "2024-04-02", user_id: 1 },
    { id: 3, title: "Car Loan Payment", amount: -420, type: "expense", category: "Debt", occurred_on: "2024-03-28", user_id: 1 },
    { id: 4, title: "Crypto Yield", amount: 280, type: "income", category: "Investments", occurred_on: "2024-03-27", user_id: 1 },
    { id: 5, title: "Groceries", amount: -180, type: "expense", category: "Living", occurred_on: "2024-03-26", user_id: 1 },
  ],
};

function auth(req, _res, next) {
  // Demo auth: use header x-user-id or default to 1
  req.userId = Number(req.headers["x-user-id"] || 1);
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true, useDb }));

app.use(auth);

// --- Helpers ---
async function listAssets(userId) {
  if (!useDb) return memory.assets.filter((a) => a.user_id === userId);
  const { rows } = await pool.query("SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return rows;
}
async function listLiabilities(userId) {
  if (!useDb) return memory.liabilities.filter((l) => l.user_id === userId);
  const { rows } = await pool.query("SELECT * FROM liabilities WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return rows;
}
async function listTransactions(userId, limit = 50) {
  if (!useDb) return memory.transactions.filter((t) => t.user_id === userId).slice(0, limit);
  const { rows } = await pool.query("SELECT * FROM transactions WHERE user_id = $1 ORDER BY occurred_on DESC, created_at DESC LIMIT $2", [
    userId,
    limit,
  ]);
  return rows;
}

// --- Routes ---
app.get("/summary", async (req, res) => {
  const userId = req.userId;
  const assets = await listAssets(userId);
  const liabilities = await listLiabilities(userId);
  const transactions = await listTransactions(userId, 500);

  const assetTotal = assets.reduce((s, a) => s + Number(a.value), 0);
  const liabilityTotal = liabilities.reduce((s, l) => s + Number(l.value), 0);
  const incomeTotal = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  res.json({
    assetTotal,
    liabilityTotal,
    netWorth: assetTotal - liabilityTotal,
    incomeTotal,
    expenseTotal,
  });
});

app.get("/assets", async (req, res) => {
  const assets = await listAssets(req.userId);
  res.json(assets);
});

app.post("/assets", async (req, res) => {
  const { name, value, tag } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: "name and value required" });
  if (!useDb) {
    const id = memory.assets.length + 1;
    const entry = { id, name, value: Number(value), tag, user_id: req.userId };
    memory.assets.push(entry);
    return res.json(entry);
  }
  const { rows } = await pool.query(
    "INSERT INTO assets (user_id, name, tag, value) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.userId, name, tag, value]
  );
  res.json(rows[0]);
});

app.get("/liabilities", async (req, res) => {
  const liabilities = await listLiabilities(req.userId);
  res.json(liabilities);
});

app.post("/liabilities", async (req, res) => {
  const { name, value, tag } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: "name and value required" });
  if (!useDb) {
    const id = memory.liabilities.length + 1;
    const entry = { id, name, value: Number(value), tag, user_id: req.userId };
    memory.liabilities.push(entry);
    return res.json(entry);
  }
  const { rows } = await pool.query(
    "INSERT INTO liabilities (user_id, name, tag, value) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.userId, name, tag, value]
  );
  res.json(rows[0]);
});

app.get("/transactions", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const tx = await listTransactions(req.userId, limit);
  res.json(tx);
});

app.post("/transactions", async (req, res) => {
  const { title, amount, type, category, occurred_on } = req.body;
  if (!title || amount === undefined || !["income", "expense"].includes(type)) {
    return res.status(400).json({ error: "title, amount, type required" });
  }
  const finalAmount = type === "income" ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
  if (!useDb) {
    const id = memory.transactions.length + 1;
    const entry = {
      id,
      title,
      category,
      type,
      amount: finalAmount,
      occurred_on: occurred_on || new Date().toISOString().slice(0, 10),
      user_id: req.userId,
    };
    memory.transactions.unshift(entry);
    return res.json(entry);
  }
  const { rows } = await pool.query(
    "INSERT INTO transactions (user_id, title, category, type, amount, occurred_on) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [req.userId, title, category, type, finalAmount, occurred_on || new Date()]
  );
  res.json(rows[0]);
});

// --- Start ---
initDb()
  .then(() => {
    app.listen(port, () => console.log(`FinMind API running on :${port} (useDb=${useDb})`));
  })
  .catch((err) => {
    console.error("DB init failed", err);
    process.exit(1);
  });
