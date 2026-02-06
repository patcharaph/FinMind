require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const OpenAI = require('openai');

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

// Initialize Database
db.initDb();

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'FinMind Server is running' });
});

// --- SNAPSHOTS API ---

// GET /api/snapshots?user_id=1
app.get('/api/snapshots', (req, res) => {
    try {
        const userId = Number(req.query.user_id) || 1;
        const snapshots = db.getSnapshots(userId);
        // Attach computed metrics to each snapshot
        const enriched = snapshots.map(s => ({ ...s, metrics: db.computeMetrics(s) }));
        res.json({ snapshots: enriched });
    } catch (err) {
        console.error('[snapshots:get]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/snapshots (upsert — one snapshot per month)
app.post('/api/snapshots', (req, res) => {
    try {
        const { user_id, market_date, cash, investments, debt, debt_interest_rate, income, expenses, risk_level } = req.body;

        if (!market_date) {
            return res.status(400).json({ error: 'market_date is required (YYYY-MM)' });
        }

        const userId = Number(user_id) || 1;
        const snapshot = db.upsertSnapshot({
            user_id: userId, market_date, cash, investments, debt, debt_interest_rate, income, expenses, risk_level
        });
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
    return `INPUT DATA:
- Cash & Savings: $${snapshot.cash}
- Monthly Income: $${snapshot.income}
- Monthly Expenses: $${snapshot.expenses}
- Total Debt: $${snapshot.debt}
- Investment Portfolio: $${snapshot.investments}
- Snapshot Period: ${snapshot.market_date}

COMPUTED METRICS:
- Net Worth: $${metrics.netWorth}
- Monthly Surplus: $${metrics.surplus}
- Savings Rate: ${(metrics.savingsRate * 100).toFixed(1)}%
- Runway: ${metrics.runwayMonths} months
- Cash/Debt Ratio: ${metrics.cashDebtRatio === -1 ? 'Debt-free' : metrics.cashDebtRatio}
- Debt-to-Asset Ratio: ${(metrics.debtToAsset * 100).toFixed(1)}%
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

// POST /api/advisor/generate
app.post('/api/advisor/generate', async (req, res) => {
    const { snapshot_id, user_id, force } = req.body;
    const userId = Number(user_id) || 1;

    if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY. Set it in server/.env' });
    }

    try {
        // 1. Return cached advice unless force refresh
        if (!force) {
            const cached = db.getAdviceForSnapshot(snapshot_id);
            if (cached) {
                return res.json({
                    financial_status: cached.financial_status,
                    risk_level: cached.risk_level,
                    liquidity_label: cached.liquidity_label,
                    summary: cached.summary,
                    key_insights: cached.key_insights,
                    actionable_steps: cached.actionable_steps,
                    cached: true,
                });
            }
        }

        // 2. Fetch snapshot
        const snapshot = db.getSnapshotById(snapshot_id, userId);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        const metrics = db.computeMetrics(snapshot);

        // 3. Call AI
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

        // 4. Parse response
        let advice;
        try {
            advice = JSON.parse(content);
        } catch (e) {
            console.error('[advisor] Failed to parse AI response:', content);
            return res.status(500).json({ error: 'AI response malformed', raw: content });
        }

        // 5. Normalize & validate fields
        const result = {
            financial_status: advice.financial_status || 'Stable',
            risk_level: advice.risk_level || 'Moderate',
            liquidity_label: advice.liquidity_label || 'moderate',
            summary: advice.summary || '',
            key_insights: Array.isArray(advice.key_insights) ? advice.key_insights.slice(0, 3) : [],
            actionable_steps: Array.isArray(advice.actionable_steps) ? advice.actionable_steps.slice(0, 3) : [],
        };

        // 6. Save to DB
        db.saveAdvice({
            user_id: userId,
            snapshot_id,
            ...result,
            raw_response: content,
            model_used: ADVISOR_MODEL,
        });

        // 7. Return
        res.json(result);

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
