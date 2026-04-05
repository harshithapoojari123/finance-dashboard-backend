const { createApp } = require("./app");
const { connectDatabase } = require("./config/db");
const { env } = require("./config/env");
const { seedDatabase } = require("./services/seedService");

async function startServer() {
  await connectDatabase(env.mongoUri);

  if (env.seedOnStartup) {
    await seedDatabase();
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Finance Dashboard API listening on http://127.0.0.1:${env.port}`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
}

module.exports = { startServer };
