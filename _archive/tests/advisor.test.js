import { test } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

process.env.NODE_ENV = "test";
process.env.FINMIND_USE_DB = "false";
process.env.ALLOW_DEV_HEADER = "false";
process.env.JWT_SECRET = "test-secret";

const { computeMetrics, evaluateRules } = await import("../advisor.js");
const { app } = await import("../server.js");

async function loginDemo() {
  const res = await supertest(app).post("/auth/login").send({ email: "demo@finmind.ai", password: "demo123" }).expect(200);
  return res.body.token;
}

test("computeMetrics calculates totals and rates", () => {
  const assets = [
    { value: 50000 },
    { value: 25000 },
  ];
  const liabilities = [{ value: 20000 }];
  const now = new Date();
  const recent = now.toISOString().slice(0, 10);
  const transactions = [
    { type: "income", amount: 5000, category: "Salary", occurred_on: recent },
    { type: "income", amount: 2500, category: "Bonus", occurred_on: recent },
    { type: "expense", amount: -1800, category: "Rent", occurred_on: recent },
    { type: "expense", amount: -700, category: "Food", occurred_on: recent },
  ];

  const metrics = computeMetrics(assets, liabilities, transactions, "last_30d");

  assert.equal(metrics.assetTotal, 75000);
  assert.equal(metrics.liabilityTotal, 20000);
  assert.equal(metrics.netWorth, 55000);
  assert.ok(metrics.debtToAssetRatio > 0.26 && metrics.debtToAssetRatio < 0.27);
  assert.equal(metrics.totalIncome, 7500);
  assert.equal(metrics.totalExpense, 2500);
  assert.equal(metrics.savingsAmount, 5000);
  assert.ok(metrics.savingsRate > 0.66 && metrics.savingsRate < 0.67);
  assert.equal(metrics.expenseByCategory.Rent, 1800);
  assert.equal(metrics.expenseByCategory.Food, 700);
  assert.ok(metrics.monthlyBurn > 2400 && metrics.monthlyBurn < 2600);
  assert.equal(metrics.transactionCount, 4);
});

test("evaluateRules flags debt, savings, and concentration", () => {
  const metrics = {
    assetTotal: 40000,
    liabilityTotal: 36000,
    netWorth: 4000,
    debtToAssetRatio: 0.9,
    totalIncome: 6000,
    totalExpense: 8000,
    savingsAmount: -2000,
    savingsRate: -0.33,
    monthlyBurn: 8000,
    expenseByCategory: { Dining: 4000, Travel: 1000 },
  };

  const rules = evaluateRules(metrics);
  const ids = rules.map((r) => r.id);

  assert.ok(ids.includes("debt-ratio-critical"));
  assert.ok(ids.includes("negative-savings"));
  assert.ok(ids.includes("expense-over-income"));
  assert.ok(ids.includes("expense-concentration"));
});

test("GET /advisor/insights returns metrics and rules (in-memory)", async () => {
  const token = await loginDemo();
  const res = await supertest(app)
    .get("/advisor/insights?period=all&lang=en")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(res.body.lang, "en");
  assert.ok(res.body.metrics);
  assert.ok(res.body.rules);
  assert.ok(Array.isArray(res.body.rules));
  assert.ok(typeof res.body.metrics.assetTotal === "number");
});

test("auth signup/login/me in memory mode", async () => {
  const email = `user${Date.now()}@test.com`;
  const password = "pass1234";

  const signupRes = await supertest(app).post("/auth/signup").send({ email, password, display_name: "Tester", plan: "prime" }).expect(200);
  assert.ok(signupRes.body.token);
  assert.equal(signupRes.body.user.email.toLowerCase(), email.toLowerCase());

  const loginRes = await supertest(app).post("/auth/login").send({ email, password }).expect(200);
  assert.ok(loginRes.body.token);
  const token = loginRes.body.token;

  const meRes = await supertest(app).get("/me").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(meRes.body.email.toLowerCase(), email.toLowerCase());
  assert.equal(meRes.body.plan, "prime");
});
