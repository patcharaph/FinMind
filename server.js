// FinMind backend scaffold: Node + Express + Postgres (optional)
// - If DATABASE_URL is set, data persists in Postgres (tables auto-created).
// - If not, falls back to in-memory storage (good for local prototyping).

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { computeMetrics, evaluateRules, generateAdvisorAdvice } from "./advisor.js";

dotenv.config();
const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const port = process.env.PORT || 4000;
const allowOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) || ["*"];
const allowDevHeader = process.env.ALLOW_DEV_HEADER === "true";
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";

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
app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(__dirname, "privacy.html"));
});
app.get("/privacy.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "privacy.html"));
});

// --- DB setup (optional) ---
const useDb = !!process.env.DATABASE_URL && process.env.FINMIND_USE_DB !== "false";
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
      plan TEXT DEFAULT 'free',
      password_hash TEXT,
      trial_started_at TIMESTAMPTZ DEFAULT now(),
      trial_expires_at TIMESTAMPTZ,
      plan_expires_at TIMESTAMPTZ,
      ai_quota INT,
      ai_quota_remaining INT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_quota INT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_quota_remaining INT;
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
  users: [
    {
      id: 1,
      email: "demo@finmind.ai",
      display_name: "Demo User",
      plan: "free",
      trial_started_at: new Date().toISOString(),
      trial_expires_at: null,
      plan_expires_at: null,
      ai_quota: null,
      ai_quota_remaining: null,
      password_hash: bcrypt.hashSync("demo123", 8),
      created_at: new Date().toISOString(),
    },
  ],
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

// --- User helpers ---
async function getUserById(id) {
  if (!useDb) {
    const u = memory.users.find((u) => u.id === id);
    return u
      ? {
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          plan: u.plan || "free",
          trial_started_at: u.trial_started_at,
          trial_expires_at: u.trial_expires_at,
          plan_expires_at: u.plan_expires_at,
          ai_quota: u.ai_quota,
          ai_quota_remaining: u.ai_quota_remaining,
        }
      : null;
  }
  const { rows } = await pool.query(
    "SELECT id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

async function getUserWithPassword(email) {
  if (!useDb) {
    const u = memory.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return u || null;
  }
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  return rows[0] || null;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getPlanEntitlements(plan, now = new Date()) {
  if (plan === "plus") {
    return { plan_expires_at: addMonths(now, 1), ai_quota: 10, ai_quota_remaining: 10 };
  }
  if (plan === "prime") {
    return { plan_expires_at: addMonths(now, 1), ai_quota: 30, ai_quota_remaining: 30 };
  }
  return { plan_expires_at: null, ai_quota: null, ai_quota_remaining: null };
}

function isPlanExpired(user) {
  if (!user?.plan_expires_at) return false;
  const expiresAt = new Date(user.plan_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function isTrialExpired(user) {
  if (!user || user.plan !== "trial") return false;
  if (!user.trial_expires_at) return true;
  const expiresAt = new Date(user.trial_expires_at).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

function isActiveTrial(user) {
  if (!user || user.plan !== "trial") return false;
  if (!user.trial_expires_at) return false;
  const expiresAt = new Date(user.trial_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function isPremiumPlan(user) {
  return ["plus", "prime"].includes(user?.plan) || isActiveTrial(user);
}

async function ensureActivePlan(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  if (isTrialExpired(user)) {
    if (!useDb) {
      const memoryUser = memory.users.find((u) => u.id === userId);
      if (!memoryUser) return null;
      memoryUser.plan = "free";
      memoryUser.ai_quota = 0;
      memoryUser.ai_quota_remaining = 0;
      return {
        id: memoryUser.id,
        email: memoryUser.email,
        display_name: memoryUser.display_name,
        plan: memoryUser.plan,
        trial_started_at: memoryUser.trial_started_at,
        trial_expires_at: memoryUser.trial_expires_at,
        plan_expires_at: memoryUser.plan_expires_at,
        ai_quota: memoryUser.ai_quota,
        ai_quota_remaining: memoryUser.ai_quota_remaining,
      };
    }

    const { rows } = await pool.query(
      "UPDATE users SET plan = 'free', ai_quota = 0, ai_quota_remaining = 0 WHERE id = $1 RETURNING id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining",
      [userId]
    );
    return rows[0] || null;
  }

  if (!isPlanExpired(user) || user.plan === "free") return user;

  if (!useDb) {
    const memoryUser = memory.users.find((u) => u.id === userId);
    if (!memoryUser) return null;
    memoryUser.plan = "free";
    memoryUser.ai_quota = 0;
    memoryUser.ai_quota_remaining = 0;
    return {
      id: memoryUser.id,
      email: memoryUser.email,
      display_name: memoryUser.display_name,
      plan: memoryUser.plan,
      trial_started_at: memoryUser.trial_started_at,
      trial_expires_at: memoryUser.trial_expires_at,
      plan_expires_at: memoryUser.plan_expires_at,
      ai_quota: memoryUser.ai_quota,
      ai_quota_remaining: memoryUser.ai_quota_remaining,
    };
  }

  const { rows } = await pool.query(
    "UPDATE users SET plan = 'free', ai_quota = 0, ai_quota_remaining = 0 WHERE id = $1 RETURNING id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining",
    [userId]
  );
  return rows[0] || null;
}

async function createUser({ email, password, display_name, plan = "free" }) {
  const password_hash = await bcrypt.hash(password, 10);
  if (!useDb) {
    const exists = memory.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("Email already exists");
    const id = memory.users.length + 1;
    const now = new Date();
    const trialExpires = plan === "prime" ? null : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const finalPlan = plan || "trial";
    const { plan_expires_at, ai_quota, ai_quota_remaining } = getPlanEntitlements(finalPlan, now);
    const user = {
      id,
      email,
      display_name,
      plan: finalPlan,
      password_hash,
      trial_started_at: now.toISOString(),
      trial_expires_at: trialExpires,
      plan_expires_at: plan_expires_at ? plan_expires_at.toISOString() : null,
      ai_quota,
      ai_quota_remaining,
      created_at: now.toISOString(),
    };
    memory.users.push(user);
    return {
      id,
      email,
      display_name,
      plan: user.plan,
      trial_started_at: user.trial_started_at,
      trial_expires_at: user.trial_expires_at,
      plan_expires_at: user.plan_expires_at,
      ai_quota: user.ai_quota,
      ai_quota_remaining: user.ai_quota_remaining,
    };
  }
  const trialExpires = plan === "prime" ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const finalPlan = plan || "trial";
  const { plan_expires_at, ai_quota, ai_quota_remaining } = getPlanEntitlements(finalPlan);
  const { rows } = await pool.query(
    "INSERT INTO users (email, display_name, plan, password_hash, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining",
    [email, display_name, finalPlan, password_hash, new Date(), trialExpires, plan_expires_at, ai_quota, ai_quota_remaining]
  );
  return rows[0];
}

function signToken(user) {
  return jwt.sign({ sub: user.id, plan: user.plan || "free" }, jwtSecret, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = jwt.verify(token, jwtSecret);
      ensureActivePlan(payload.sub)
        .then((user) => {
          if (!user) return res.status(401).json({ error: "Unauthorized" });
          req.userId = user.id;
          req.userPlan = user.plan || "free";
          return next();
        })
        .catch(() => res.status(401).json({ error: "Unauthorized" }));
      return;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // Optional dev override if explicitly enabled
  if (allowDevHeader && req.headers["x-user-id"]) {
    const fallbackId = Number(req.headers["x-user-id"]);
    if (Number.isNaN(fallbackId)) return res.status(401).json({ error: "Unauthorized" });
    ensureActivePlan(fallbackId)
      .then((user) => {
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        req.userId = user.id;
        req.userPlan = user.plan || "free";
        return next();
      })
      .catch(() => res.status(401).json({ error: "Unauthorized" }));
    return;
  }

  return res.status(401).json({ error: "Unauthorized" });
}

app.get("/health", (_req, res) => res.json({ ok: true, useDb }));

app.post("/auth/signup", async (req, res) => {
  const { email, password, display_name, plan } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  try {
    const existing = await getUserWithPassword(email);
    if (existing) return res.status(400).json({ error: "email already registered" });
    const user = await createUser({ email, password, display_name, plan: plan || "free" });
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message || "signup failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const user = await getUserWithPassword(email);
  if (!user || !user.password_hash) return res.status(401).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });
  const freshUser = (await ensureActivePlan(user.id)) || user;
  const safeUser = {
    id: freshUser.id,
    email: freshUser.email,
    display_name: freshUser.display_name,
    plan: freshUser.plan || "free",
    trial_started_at: freshUser.trial_started_at,
    trial_expires_at: freshUser.trial_expires_at,
    plan_expires_at: freshUser.plan_expires_at,
    ai_quota: freshUser.ai_quota,
    ai_quota_remaining: freshUser.ai_quota_remaining,
  };
  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

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
app.get("/me", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.get("/quota", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    plan: user.plan || "free",
    ai_quota: user.ai_quota,
    ai_quota_remaining: user.ai_quota_remaining,
  });
});

app.put("/me", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const { display_name } = req.body || {};
  if (!display_name || display_name.length < 2) return res.status(400).json({ error: "display_name too short" });
  try {
    if (!useDb) {
      const user = memory.users.find((u) => u.id === req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      user.display_name = display_name;
      return res.json({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        plan: user.plan || "free",
        trial_started_at: user.trial_started_at,
        trial_expires_at: user.trial_expires_at,
        plan_expires_at: user.plan_expires_at,
        ai_quota: user.ai_quota,
        ai_quota_remaining: user.ai_quota_remaining,
      });
    }
    const { rows } = await pool.query(
      "UPDATE users SET display_name = $1 WHERE id = $2 RETURNING id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining",
      [display_name, req.userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message || "update failed" });
  }
});

// --- Billing (mock) ---
app.post("/billing/intent", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const { plan, billing_cycle } = req.body || {};
  if (!["plus", "prime"].includes(plan)) return res.status(400).json({ error: "invalid plan" });
  const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
  if (process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: "Stripe not wired yet" });
  }
  return res.json({
    mock: true,
    client_secret: `mock_${plan}_${cycle}_${Date.now()}`,
    plan,
    billing_cycle: cycle,
  });
});

app.post("/billing/confirm", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const { plan, billing_cycle } = req.body || {};
  if (!["plus", "prime"].includes(plan)) return res.status(400).json({ error: "invalid plan" });
  const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
  if (process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: "Stripe not wired yet" });
  }
  const { plan_expires_at, ai_quota, ai_quota_remaining } = getPlanEntitlements(plan);
  try {
    if (!useDb) {
      const user = memory.users.find((u) => u.id === req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      user.plan = plan;
      user.trial_expires_at = null;
      user.plan_expires_at = plan_expires_at ? plan_expires_at.toISOString() : null;
      user.ai_quota = ai_quota;
      user.ai_quota_remaining = ai_quota_remaining;
      return res.json({
        status: "ok",
        plan,
        billing_cycle: cycle,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          plan: user.plan,
          trial_started_at: user.trial_started_at,
          trial_expires_at: user.trial_expires_at,
          plan_expires_at: user.plan_expires_at,
          ai_quota: user.ai_quota,
          ai_quota_remaining: user.ai_quota_remaining,
        },
      });
    }
    const { rows } = await pool.query(
      "UPDATE users SET plan = $1, trial_expires_at = NULL, plan_expires_at = $2, ai_quota = $3, ai_quota_remaining = $4 WHERE id = $5 RETURNING id, email, display_name, plan, trial_started_at, trial_expires_at, plan_expires_at, ai_quota, ai_quota_remaining",
      [plan, plan_expires_at, ai_quota, ai_quota_remaining, req.userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ status: "ok", plan, billing_cycle: cycle, user });
  } catch (err) {
    res.status(400).json({ error: err.message || "billing confirm failed" });
  }
});

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

app.put("/assets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, value, tag } = req.body;
  if (!id || !name || value === undefined) return res.status(400).json({ error: "id, name, value required" });
  if (!useDb) {
    const idx = memory.assets.findIndex((a) => a.id === id && a.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    memory.assets[idx] = { ...memory.assets[idx], name, value: Number(value), tag };
    return res.json(memory.assets[idx]);
  }
  const { rows } = await pool.query(
    "UPDATE assets SET name=$1, tag=$2, value=$3 WHERE id=$4 AND user_id=$5 RETURNING *",
    [name, tag, value, id, req.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.delete("/assets/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id required" });
  if (!useDb) {
    const idx = memory.assets.findIndex((a) => a.id === id && a.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const removed = memory.assets.splice(idx, 1)[0];
    return res.json(removed);
  }
  const { rows } = await pool.query("DELETE FROM assets WHERE id=$1 AND user_id=$2 RETURNING *", [id, req.userId]);
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
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

app.put("/liabilities/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, value, tag } = req.body;
  if (!id || !name || value === undefined) return res.status(400).json({ error: "id, name, value required" });
  if (!useDb) {
    const idx = memory.liabilities.findIndex((l) => l.id === id && l.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    memory.liabilities[idx] = { ...memory.liabilities[idx], name, value: Number(value), tag };
    return res.json(memory.liabilities[idx]);
  }
  const { rows } = await pool.query(
    "UPDATE liabilities SET name=$1, tag=$2, value=$3 WHERE id=$4 AND user_id=$5 RETURNING *",
    [name, tag, value, id, req.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.delete("/liabilities/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id required" });
  if (!useDb) {
    const idx = memory.liabilities.findIndex((l) => l.id === id && l.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const removed = memory.liabilities.splice(idx, 1)[0];
    return res.json(removed);
  }
  const { rows } = await pool.query("DELETE FROM liabilities WHERE id=$1 AND user_id=$2 RETURNING *", [id, req.userId]);
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
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

app.put("/transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, amount, type, category, occurred_on } = req.body;
  if (!id || !title || amount === undefined || !["income", "expense"].includes(type)) {
    return res.status(400).json({ error: "id, title, amount, type required" });
  }
  const finalAmount = type === "income" ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
  if (!useDb) {
    const idx = memory.transactions.findIndex((t) => t.id === id && t.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    memory.transactions[idx] = {
      ...memory.transactions[idx],
      title,
      category,
      type,
      amount: finalAmount,
      occurred_on: occurred_on || memory.transactions[idx].occurred_on,
    };
    return res.json(memory.transactions[idx]);
  }
  const { rows } = await pool.query(
    "UPDATE transactions SET title=$1, category=$2, type=$3, amount=$4, occurred_on=$5 WHERE id=$6 AND user_id=$7 RETURNING *",
    [title, category, type, finalAmount, occurred_on || new Date(), id, req.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.delete("/transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id required" });
  if (!useDb) {
    const idx = memory.transactions.findIndex((t) => t.id === id && t.user_id === req.userId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const removed = memory.transactions.splice(idx, 1)[0];
    return res.json(removed);
  }
  const { rows } = await pool.query("DELETE FROM transactions WHERE id=$1 AND user_id=$2 RETURNING *", [id, req.userId]);
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// --- Advisor Insights ---
app.get("/advisor/insights", async (req, res) => {
  const period = typeof req.query.period === "string" ? req.query.period : "last_90d";
  const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
  const userId = req.userId;

  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!isPremiumPlan(user)) {
    return res.status(402).json({
      error: "plan_required",
      message: "Upgrade to unlock advisor insights",
    });
  }
  const remaining = user.ai_quota_remaining ?? null;
  if (user.plan === "plus" && remaining !== null && remaining <= 0) {
    return res.status(402).json({
      error: "quota_exhausted",
      message: "You've used all AI insights this month",
    });
  }

  const [assets, liabilities, transactions] = await Promise.all([
    listAssets(userId),
    listLiabilities(userId),
    listTransactions(userId, 500),
  ]);

  const metrics = computeMetrics(assets, liabilities, transactions, period);
  const rules = evaluateRules(metrics);
  const llmAdvice = await generateAdvisorAdvice(metrics, rules, lang);

  if (user.plan === "plus" && remaining !== null) {
    if (!useDb) {
      const memoryUser = memory.users.find((u) => u.id === userId);
      if (memoryUser) {
        memoryUser.ai_quota_remaining = Math.max(0, Number(memoryUser.ai_quota_remaining || 0) - 1);
      }
    } else {
      await pool.query(
        "UPDATE users SET ai_quota_remaining = GREATEST(COALESCE(ai_quota_remaining, 0) - 1, 0) WHERE id = $1",
        [userId]
      );
    }
  }

  res.json({
    period,
    lang,
    metrics,
    rules,
    llm_advice: llmAdvice,
  });
});

// --- Start ---
export async function start() {
  await initDb();
  return app.listen(port, () => console.log(`FinMind API running on :${port} (useDb=${useDb})`));
}

if (process.env.NODE_ENV !== "test") {
  start().catch((err) => {
    console.error("DB init failed", err);
    process.exit(1);
  });
}
