require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

// Database: Use Supabase in production, SQLite in development
const USE_SUPABASE = process.env.USE_SUPABASE === 'true';
const db = USE_SUPABASE ? require('./db-supabase') : require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['*'];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json());

// Rate Limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in 15 minutes.' },
});
app.use('/api/', apiLimiter);

// Initialize Database (SQLite only)
if (!USE_SUPABASE && db.initDb) {
    db.initDb();
}
console.log(`[server] Database: ${USE_SUPABASE ? 'Supabase (PostgreSQL)' : 'SQLite'}`);

// OpenRouter / OpenAI Setup
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'https://finmind.app',
        'X-Title': 'FinMind',
    },
});

const ADVISOR_MODEL = process.env.ADVISOR_MODEL || 'google/gemini-2.5-flash';

// --- Routes ---

app.get('/api/health', async (req, res) => {
    if (USE_SUPABASE && db.healthCheck) {
        const health = await db.healthCheck();
        return res.json({ ...health, message: 'FinMind Server is running' });
    }
    res.json({ status: 'ok', database: 'sqlite', message: 'FinMind Server is running' });
});

// --- SNAPSHOTS API ---

// Helper: Get or create user by device_id (Supabase) or use numeric ID (SQLite)
const resolveUserId = async (req) => {
    const device_id = req.headers['x-device-id'] || req.query.device_id || req.body?.device_id;
    
    if (USE_SUPABASE) {
        if (!device_id) throw new Error('device_id is required');
        const user = await db.getOrCreateUser(device_id);
        return user.id;
    }
    // SQLite fallback: use numeric user_id
    return Number(req.query.user_id || req.body?.user_id) || 1;
};

// GET /api/snapshots
app.get('/api/snapshots', async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const snapshots = USE_SUPABASE 
            ? await db.getSnapshots(userId)
            : db.getSnapshots(userId);
        // Attach computed metrics to each snapshot
        const enriched = snapshots.map(s => ({ ...s, metrics: db.computeMetrics(s) }));
        res.json({ snapshots: enriched });
    } catch (err) {
        console.error('[snapshots:get]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/snapshots (upsert — one snapshot per month)
app.post('/api/snapshots', async (req, res) => {
    try {
        const { 
            market_date, 
            cash_savings, investments, personal_assets, other_assets,
            short_term_debt, long_term_debt, debt_interest_rate,
            income, expenses, risk_level 
        } = req.body;

        if (!market_date) {
            return res.status(400).json({ error: 'market_date is required (YYYY-MM)' });
        }

        const userId = await resolveUserId(req);
        const snapshotData = { 
            user_id: userId, market_date, 
            cash_savings, investments, personal_assets, other_assets,
            short_term_debt, long_term_debt, debt_interest_rate,
            income, expenses, risk_level 
        };
        const snapshot = USE_SUPABASE
            ? await db.upsertSnapshot(snapshotData)
            : db.upsertSnapshot(snapshotData);
        const metrics = db.computeMetrics(snapshot);

        res.json({ success: true, snapshot: { ...snapshot, metrics } });
    } catch (err) {
        console.error('[snapshots:post]', err);
        res.status(500).json({ error: err.message });
    }
});

// --- AI ADVISOR API ---

const SYSTEM_PROMPT = `You are FinMind Advisor — a Senior Wealth Management Strategist with 20+ years advising high-net-worth individuals at a top-tier private bank. You combine quantitative rigor with practical behavioral finance. Your tone is calm, professional, and direct.

ANALYSIS FRAMEWORK (apply in order):
1. LIQUIDITY CHECK — Is cash >= 3 months of expenses? (Emergency fund benchmark)
2. DEBT ASSESSMENT — Debt-to-Asset ratio. If > 50%, flag as high leverage. Recommend Avalanche (highest interest first) or Snowball (smallest balance first).
3. SAVINGS EFFICIENCY — Savings Rate = (Income - Expenses) / Income. Below 20% = needs improvement. Below 10% = critical.
4. INVESTMENT EXPOSURE — Investments / (Cash + Investments). Under-invested (< 40%) or over-concentrated (> 80%).
5. RUNWAY — Cash / Monthly Expenses = months of survival. Below 3 = danger. 3-6 = adequate. 6+ = strong.

RULES:
- Always reference specific numbers from the input (e.g., "Your $12,000 cash covers 3.2 months of expenses").
- Never use vague advice like "save more" — always quantify (e.g., "Increase monthly savings by $200").
- If debt exists, name a specific repayment strategy (Avalanche or Snowball) and explain why.
- If investments are zero, recommend starting with a specific allocation.
- Maximum 3 key_insights and 3 actionable_steps. Quality over quantity.
- Return ONLY a valid JSON object. No markdown. No pre-text. No post-text.`;

const buildUserPrompt = (snapshot, metrics) => {
    // Support both old and new field names
    const cashSavings = snapshot.cash_savings || snapshot.cash || 0;
    const shortTermDebt = snapshot.short_term_debt || snapshot.debt || 0;
    const longTermDebt = snapshot.long_term_debt || 0;
    
    return `INPUT DATA:
ASSETS:
- Cash & Savings: $${cashSavings}
- Investment Portfolio: $${snapshot.investments || 0}
- Personal Assets (Home, Car): $${snapshot.personal_assets || 0}
- Other Assets: $${snapshot.other_assets || 0}

LIABILITIES:
- Short-term Debt: $${shortTermDebt}
- Long-term Debt: $${longTermDebt}
- Avg Debt Interest Rate: ${snapshot.debt_interest_rate || 0}%

CASH FLOW:
- Monthly Income: $${snapshot.income || 0}
- Monthly Expenses: $${snapshot.expenses || 0}

SETTINGS:
- Investment Risk Level: ${snapshot.risk_level || 'moderate'}
- Snapshot Period: ${snapshot.market_date}

COMPUTED METRICS:
- Total Assets: $${metrics.totalAssets}
- Liquid Assets: $${metrics.liquidAssets}
- Total Debt: $${metrics.totalDebt}
- Net Worth: $${metrics.netWorth}
- Monthly Surplus: $${metrics.surplus}
- Savings Rate: ${(metrics.savingsRate * 100).toFixed(1)}%
- Emergency Runway: ${metrics.runwayMonths} months
- Debt-to-Asset Ratio: ${(metrics.debtToAsset * 100).toFixed(1)}%
- Liquidity Ratio: ${metrics.liquidityRatio === -1 ? 'No short-term debt' : metrics.liquidityRatio}
- Investment Ratio: ${(metrics.investmentRatio * 100).toFixed(1)}%

OUTPUT FORMAT (strict JSON):
{
  "financial_status": "One of: Liquidity Crisis | Debt Danger | Stable | Accumulating | Wealth Building",
  "risk_level": "Low | Moderate | High",
  "liquidity_label": "strong | moderate | weak",
  "summary": "2-3 sentence professional assessment with specific numbers.",
  "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "actionable_steps": ["Step 1", "Step 2", "Step 3"]
}`;
};

// GET /api/advisor/usage - Check AI usage for today
app.get('/api/advisor/usage', async (req, res) => {
    try {
        const userId = await resolveUserId(req);
        const usage = USE_SUPABASE 
            ? await db.getAiUsageInfo(userId)
            : db.getAiUsageInfo(userId);
        res.json(usage);
    } catch (err) {
        console.error('[advisor:usage]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/advisor/generate
app.post('/api/advisor/generate', async (req, res) => {
    const { snapshot_id, force } = req.body;

    if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY. Set it in server/.env' });
    }

    let userId;
    try {
        userId = await resolveUserId(req);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    try {
        // 1. Return cached advice unless force refresh (cached doesn't count against limit)
        if (!force) {
            const cached = USE_SUPABASE 
                ? await db.getAdviceForSnapshot(snapshot_id)
                : db.getAdviceForSnapshot(snapshot_id);
            if (cached) {
                const usage = USE_SUPABASE 
                    ? await db.getAiUsageInfo(userId)
                    : db.getAiUsageInfo(userId);
                return res.json({
                    financial_status: cached.financial_status,
                    risk_level: cached.risk_level,
                    liquidity_label: cached.liquidity_label,
                    summary: cached.summary,
                    key_insights: cached.key_insights,
                    actionable_steps: cached.actionable_steps,
                    cached: true,
                    usage,
                });
            }
        }

        // 2. Check daily AI limit (only for new/forced requests)
        const canUse = USE_SUPABASE ? await db.canUseAi(userId) : db.canUseAi(userId);
        if (!canUse) {
            const usage = USE_SUPABASE 
                ? await db.getAiUsageInfo(userId)
                : db.getAiUsageInfo(userId);
            return res.status(429).json({
                error: "You've reached this month's AI advice limit.",
                message: "Upgrade to unlock unlimited insights.",
                limit_reached: true,
                usage,
            });
        }

        // 3. Fetch snapshot
        const snapshot = USE_SUPABASE
            ? await db.getSnapshotById(snapshot_id, userId)
            : db.getSnapshotById(snapshot_id, userId);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        const metrics = db.computeMetrics(snapshot);

        // 4. Call AI
        const completion = await openai.chat.completions.create({
            model: ADVISOR_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildUserPrompt(snapshot, metrics) }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 600,
            temperature: 0.3,
        });

        const content = completion.choices[0].message.content;

        // 5. Increment usage counter (only after successful AI call)
        if (USE_SUPABASE) {
            await db.incrementAiUsage(userId);
        } else {
            db.incrementAiUsage(userId);
        }

        // 6. Parse response
        let advice;
        try {
            advice = JSON.parse(content);
        } catch (e) {
            console.error('[advisor] Failed to parse AI response:', content);
            return res.status(500).json({ error: 'AI response malformed', raw: content });
        }

        // 7. Normalize & validate fields
        const result = {
            financial_status: advice.financial_status || 'Stable',
            risk_level: advice.risk_level || 'Moderate',
            liquidity_label: advice.liquidity_label || 'moderate',
            summary: advice.summary || '',
            key_insights: Array.isArray(advice.key_insights) ? advice.key_insights.slice(0, 3) : [],
            actionable_steps: Array.isArray(advice.actionable_steps) ? advice.actionable_steps.slice(0, 3) : [],
        };

        // 8. Save to DB
        if (USE_SUPABASE) {
            await db.saveAdvice({
                user_id: userId,
                snapshot_id,
                ...result,
                raw_response: content,
                model_used: ADVISOR_MODEL,
            });
        } else {
            db.saveAdvice({
                user_id: userId,
                snapshot_id,
                ...result,
                raw_response: content,
                model_used: ADVISOR_MODEL,
            });
        }

        // 9. Return with usage info
        const usage = USE_SUPABASE 
            ? await db.getAiUsageInfo(userId)
            : db.getAiUsageInfo(userId);
        res.json({ ...result, usage });

    } catch (err) {
        console.error('[advisor]', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Start server ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[server] FinMind running on http://localhost:${PORT}`);
    });
}

module.exports = app;
