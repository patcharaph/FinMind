import { createApp } from "./app.js";
import { initDb } from "./db.js";
import { createOpenRouterClient, generateInsight } from "./ai/openrouter.js";

const port = process.env.PORT || 3001;
const db = initDb();
const client = createOpenRouterClient();

const app = createApp({
  db,
  ai: {
    generateInsight: (snapshot) => generateInsight({ client, snapshot })
  }
});

app.listen(port, () => {
  console.log(`FinMind server running on ${port}`);
});
