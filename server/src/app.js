import express from "express";

const DEFAULT_USER_ID = 1;

const ensureUser = (db) => {
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(DEFAULT_USER_ID);
  if (!user) {
    db.prepare("INSERT INTO users (id, created_at) VALUES (?, ?)").run(
      DEFAULT_USER_ID,
      new Date().toISOString()
    );
  }
};

export const createApp = ({ db, ai }) => {
  const app = express();
  app.use(express.json());

  app.post("/api/user/data", (req, res) => {
    const snapshot = req.body;
    if (!snapshot) {
      return res.status(400).json({ error: "Snapshot required" });
    }

    ensureUser(db);

    const stmt = db.prepare(
      "INSERT INTO snapshots (user_id, cash, debt, investment, income, expense, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const info = stmt.run(
      DEFAULT_USER_ID,
      snapshot.cash || 0,
      snapshot.debt || 0,
      snapshot.investment || 0,
      snapshot.income || 0,
      snapshot.expense || 0,
      new Date().toISOString()
    );

    const latest = db.prepare("SELECT * FROM snapshots WHERE id = ?").get(info.lastInsertRowid);
    return res.json({ latest });
  });

  app.get("/api/user/data", (req, res) => {
    ensureUser(db);
    const latest = db
      .prepare("SELECT * FROM snapshots WHERE user_id = ? ORDER BY date DESC LIMIT 1")
      .get(DEFAULT_USER_ID);
    const history = db
      .prepare("SELECT * FROM snapshots WHERE user_id = ? ORDER BY date DESC LIMIT 5")
      .all(DEFAULT_USER_ID);
    return res.json({ latest, history });
  });

  app.post("/api/advisor/insight", async (req, res) => {
    const snapshot = req.body?.snapshot;
    if (!snapshot) {
      return res.status(400).json({ error: "Snapshot required" });
    }

    try {
      ensureUser(db);
      const saved = db.prepare(
        "INSERT INTO snapshots (user_id, cash, debt, investment, income, expense, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        DEFAULT_USER_ID,
        snapshot.cash || 0,
        snapshot.debt || 0,
        snapshot.investment || 0,
        snapshot.income || 0,
        snapshot.expense || 0,
        new Date().toISOString()
      );
      const snapshotId = saved.lastInsertRowid;

      const insight = await ai.generateInsight(snapshot);
      const safeInsight = {
        status: insight?.status || "Status unavailable",
        insight: insight?.insight || "Insight unavailable",
        action: insight?.action || "Action unavailable",
        riskLevel: insight?.riskLevel || "medium"
      };
      const adviceText = `Status: ${safeInsight.status}\nInsight: ${safeInsight.insight}\nAction: ${safeInsight.action}`;
      db.prepare(
        "INSERT INTO advice_history (user_id, snapshot_id, advice_text, risk_level, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(DEFAULT_USER_ID, snapshotId, adviceText, safeInsight.riskLevel, new Date().toISOString());

      return res.json(safeInsight);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Advisor failed" });
    }
  });

  return app;
};
