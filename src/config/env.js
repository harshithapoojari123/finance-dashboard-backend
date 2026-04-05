const path = require("path");

const env = {
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finance_dashboard",
  jwtSecret: process.env.JWT_SECRET || "assignment-review-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  seedOnStartup: process.env.SEED_ON_STARTUP !== "false",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 200),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  mongoTestDbPath:
    process.env.MONGO_TEST_DB_PATH || path.join(process.cwd(), ".mongodb-test-data"),
};

module.exports = { env };
