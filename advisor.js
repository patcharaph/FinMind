// Advisor utilities: metrics calculation, rule evaluation, optional LLM advice
import dotenv from "dotenv";

dotenv.config();

// --- Helpers ---
function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getPeriodRange(period) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  switch (period) {
    case "last_30d":
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now, days: 30 };
    case "last_90d":
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now, days: 90 };
    case "ytd":
      return { from: startOfYear, to: now, days: Math.max(1, Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24))) };
    default:
      return { from: null, to: now, days: 90 };
  }
}

export function filterTransactionsByPeriod(transactions, period = "last_90d") {
  const range = getPeriodRange(period);
  if (!range.from) return transactions;
  return transactions.filter((t) => {
    const d = parseDateSafe(t.occurred_on || t.created_at);
    if (!d) return false;
    return d >= range.from && d <= range.to;
  });
}

export function computeMetrics(assets = [], liabilities = [], transactions = [], period = "last_90d") {
  const filtered = filterTransactionsByPeriod(transactions, period);
  const periodRange = getPeriodRange(period);

  const assetTotal = assets.reduce((s, a) => s + Number(a.value || 0), 0);
  const liabilityTotal = liabilities.reduce((s, l) => s + Number(l.value || 0), 0);
  const netWorth = assetTotal - liabilityTotal;

  const incomeTx = filtered.filter((t) => t.type === "income");
  const expenseTx = filtered.filter((t) => t.type === "expense");

  const totalIncome = incomeTx.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const totalExpense = expenseTx.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const savingsAmount = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? savingsAmount / totalIncome : null;

  const expenseByCategory = expenseTx.reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.amount || 0));
    return acc;
  }, {});

  const averageDailyExpense = periodRange.days ? totalExpense / periodRange.days : 0;
  const monthlyBurn = averageDailyExpense * 30;

  return {
    period,
    assetTotal,
    liabilityTotal,
    netWorth,
    debtToAssetRatio: assetTotal > 0 ? liabilityTotal / assetTotal : null,
    totalIncome,
    totalExpense,
    savingsAmount,
    savingsRate,
    expenseByCategory,
    averageDailyExpense,
    monthlyBurn,
    transactionCount: filtered.length,
  };
}

export function evaluateRules(metrics) {
  const rules = [];

  if (metrics.assetTotal === 0 && metrics.liabilityTotal > 0) {
    rules.push({
      id: "no-assets",
      severity: "critical",
      title: "Liabilities without assets",
      message: "You have liabilities but no recorded assets. Add assets or reduce debt to avoid negative net worth.",
      tags: ["assets", "debt"],
    });
  }

  if (metrics.debtToAssetRatio !== null) {
    if (metrics.debtToAssetRatio >= 0.9) {
      rules.push({
        id: "debt-ratio-critical",
        severity: "critical",
        title: "Debt heavy portfolio",
        message: "Debt-to-asset ratio is above 90%. Prioritize paying down liabilities.",
        tags: ["debt"],
      });
    } else if (metrics.debtToAssetRatio > 0.5) {
      rules.push({
        id: "debt-ratio-warning",
        severity: "warning",
        title: "High leverage",
        message: "Debt-to-asset ratio is above 50%. Consider reducing liabilities or increasing assets.",
        tags: ["debt"],
      });
    }
  }

  if (metrics.savingsRate !== null) {
    if (metrics.savingsRate < 0.1) {
      rules.push({
        id: "low-savings-rate",
        severity: "warning",
        title: "Low savings rate",
        message: "Savings rate is below 10%. Try trimming expenses or boosting income.",
        tags: ["cashflow"],
      });
    }
    if (metrics.savingsRate < 0) {
      rules.push({
        id: "negative-savings",
        severity: "critical",
        title: "Spending exceeds income",
        message: "Expenses exceed income. Review recurring costs and discretionary spend.",
        tags: ["cashflow"],
      });
    }
  }

  if (metrics.totalExpense > metrics.totalIncome && metrics.totalIncome > 0) {
    rules.push({
      id: "expense-over-income",
      severity: "warning",
      title: "Expenses exceed income",
      message: "Your expenses in this period are higher than income. Adjust spend or increase earnings.",
      tags: ["cashflow"],
    });
  }

  if (metrics.monthlyBurn && metrics.netWorth > 0) {
    const monthsOfRunway = metrics.monthlyBurn > 0 ? metrics.netWorth / metrics.monthlyBurn : null;
    if (monthsOfRunway !== null && monthsOfRunway < 3) {
      rules.push({
        id: "short-runway",
        severity: "warning",
        title: "Short financial runway",
        message: "Net worth covers less than 3 months of expenses. Build a larger buffer.",
        tags: ["liquidity"],
      });
    }
  }

  if (metrics.expenseByCategory) {
    const entries = Object.entries(metrics.expenseByCategory);
    if (entries.length > 0) {
      const total = entries.reduce((s, [, v]) => s + v, 0);
      const sorted = entries.sort((a, b) => b[1] - a[1]);
      const [topCat, topVal] = sorted[0];
      if (total > 0 && topVal / total > 0.4) {
        rules.push({
          id: "expense-concentration",
          severity: "info",
          title: "Expense concentration",
          message: `High spend concentration in ${topCat} (${Math.round((topVal / total) * 100)}% of expenses). Diversify or cap this category.`,
          tags: ["spending"],
        });
      }
    }
  }

  return rules;
}

export async function generateAdvisorAdvice(metrics, rules, lang = "en") {
  const provider = process.env.LLM_PROVIDER || process.env.ADVISOR_LLM_PROVIDER || "openai";
  const apiKey =
    process.env.LLM_API_KEY ||
    (provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
    (provider === "openrouter" ? process.env.OPENROUTER_API_KEY : null);
  const model =
    process.env.ADVISOR_LLM_MODEL ||
    (provider === "openrouter" ? "openrouter/openai/gpt-4o-mini" : "gpt-4.1-mini");

  if (!apiKey) return null;

  const system =
    "You are a personal finance advisor. Tone: calm, candid, and practical. Use plain English with no hype or emojis.";
  const user = {
    metrics,
    rules,
    instruction:
      "In 4-6 sentences, follow this structure: 1) Diagnosis: start with a direct assessment of current status (e.g., Health Score, Burn Rate). 2) Risks: highlight the single biggest risk immediately. 3) Action & Method: provide 1-2 next steps, explicitly naming a financial strategy or method to use (e.g., Debt Avalanche, 50/30/20 rule, DCA). 4) Sparse Data: if data is insufficient, suggest tracking specific missing categories. Respond in English only. Keep it concise but strategic.",
    language: "en",
  };

  const payload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_tokens: 300,
    temperature: 0.4,
  };

  const endpoints = {
    openai: "https://api.openai.com/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter optional headers to comply with policy (safe defaults)
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERRER || "https://finmind.app";
    headers["X-Title"] = process.env.OPENROUTER_TITLE || "FinMind Advisor";
  }

  const url = endpoints[provider];
  if (!url) return null;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (_err) {
    return null;
  }
}
