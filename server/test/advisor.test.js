import request from "supertest";
import { createApp } from "../src/app.js";
import { initDb } from "../src/db.js";

describe("advisor endpoint", () => {
  it("returns structured insight", async () => {
    const db = initDb(":memory:");
    const ai = {
      generateInsight: async () => ({
        status: "Stable",
        insight: "Cash runway covers 2 months.",
        action: "Trim expenses by 10%.",
        riskLevel: "medium"
      })
    };

    const app = createApp({ db, ai });
    const response = await request(app)
      .post("/api/advisor/insight")
      .send({ snapshot: { cash: 1000, debt: 2000, investment: 5000, income: 4000, expense: 3000 } });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("Stable");
    expect(response.body.action).toContain("Trim");
  });
});
