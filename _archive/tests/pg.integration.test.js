import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const TEST_DB = process.env.TEST_DATABASE_URL;
const shouldSkip = !TEST_DB;

async function waitForHealth(port, attempts = 15) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return true;
    } catch (_err) {
      // ignore and retry
    }
    await delay(500);
  }
  return false;
}

test("Postgres integration: signup + advisor insights", { skip: shouldSkip }, async (t) => {
  const port = 4100;
  const env = {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: TEST_DB,
    FINMIND_USE_DB: "true",
    NODE_ENV: "test",
    JWT_SECRET: "ci-secret",
    ALLOW_DEV_HEADER: "false",
  };

  const child = spawn(process.execPath, ["tests/pg_test_server.js"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  t.after(() => {
    child.kill("SIGTERM");
  });

  const ready = await waitForHealth(port);
  assert.ok(ready, "server did not become healthy in time");

  const email = `pg${Date.now()}@test.com`;
  const password = "pass1234";

  const signupRes = await fetch(`http://localhost:${port}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: "PG Tester", plan: "prime" }),
  });
  assert.ok(signupRes.ok, "signup failed");
  const signupBody = await signupRes.json();
  const token = signupBody.token;
  assert.ok(token, "token missing");

  const insightsRes = await fetch(`http://localhost:${port}/advisor/insights?period=last_30d&lang=en`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.ok(insightsRes.ok, "advisor insights failed");
  const insights = await insightsRes.json();
  assert.equal(insights.lang, "en");
  assert.ok(insights.metrics);
  assert.ok(Array.isArray(insights.rules));
});
