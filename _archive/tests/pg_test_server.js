import { start } from "../server.js";

const server = await start();

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
