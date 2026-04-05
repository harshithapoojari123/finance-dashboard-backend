const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const { connectDatabase, disconnectDatabase } = require("../src/config/db");
const { seedDatabase } = require("../src/services/seedService");
const { createApp } = require("../src/app");
const { env } = require("../src/config/env");

const MONGO_PORT = 27018;
const APP_PORT = 3100;
const MONGO_URI = `mongodb://127.0.0.1:${MONGO_PORT}/finance_dashboard_test`;

let mongoProcess;
let server;
let tempRoot;

function waitForPort(port, host = "127.0.0.1", timeoutMs = 15000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

async function request(method, route, { token, body } = {}) {
  const response = await fetch(`http://127.0.0.1:${APP_PORT}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function login(email, password) {
  const response = await request("POST", "/api/auth/login", {
    body: { email, password },
  });

  assert.equal(response.status, 200);
  return response.body.token;
}

test.before(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "finance-dashboard-"));
  const dbPath = path.join(tempRoot, "db");
  const logPath = path.join(tempRoot, "mongo.log");
  fs.mkdirSync(dbPath, { recursive: true });

  mongoProcess = spawn(
    "mongod",
    ["--dbpath", dbPath, "--port", String(MONGO_PORT), "--bind_ip", "127.0.0.1", "--logpath", logPath],
    { stdio: "ignore" }
  );

  await waitForPort(MONGO_PORT);
  await connectDatabase(MONGO_URI);
  await seedDatabase();

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(APP_PORT, resolve);
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await disconnectDatabase();

  if (mongoProcess) {
    mongoProcess.kill();
  }
});

test("admin can create and list users", async () => {
  const adminToken = await login("admin@dashboard.local", "Admin123!");

  const created = await request("POST", "/api/users", {
    token: adminToken,
    body: {
      name: "New Analyst",
      email: "new.analyst@dashboard.local",
      password: "SecurePass123!",
      role: "analyst",
    },
  });

  assert.equal(created.status, 200);
  assert.equal(created.body.user.role, "analyst");

  const listed = await request("GET", "/api/users", { token: adminToken });
  assert.equal(listed.status, 200);
  assert.ok(listed.body.items.length >= 4);
});

test("viewer can read dashboard but cannot read records", async () => {
  const viewerToken = await login("viewer@dashboard.local", "Viewer123!");

  const summary = await request("GET", "/api/dashboard/summary", { token: viewerToken });
  assert.equal(summary.status, 200);
  assert.ok(typeof summary.body.netBalance === "number");

  const records = await request("GET", "/api/records", { token: viewerToken });
  assert.equal(records.status, 403);
  assert.equal(records.body.error.code, "authorization_error");
});

test("analyst can list records, search them, and fetch trends", async () => {
  const analystToken = await login("analyst@dashboard.local", "Analyst123!");

  const records = await request("GET", "/api/records?page=1&page_size=2&type=expense", {
    token: analystToken,
  });

  assert.equal(records.status, 200);
  assert.equal(records.body.pagination.pageSize, 2);
  assert.ok(records.body.items.every((item) => item.type === "expense"));

  const searchResults = await request("GET", "/api/records?search=client", {
    token: analystToken,
  });

  assert.equal(searchResults.status, 200);
  assert.ok(searchResults.body.items.length >= 1);
  assert.ok(
    searchResults.body.items.some(
      (item) => item.category.toLowerCase().includes("client") || item.notes.toLowerCase().includes("client")
    )
  );

  const trends = await request("GET", "/api/dashboard/trends?months=6", {
    token: analystToken,
  });

  assert.equal(trends.status, 200);
  assert.ok(Array.isArray(trends.body.items));
});

test("admin soft delete hides records from normal reads and dashboard totals", async () => {
  const adminToken = await login("admin@dashboard.local", "Admin123!");

  const created = await request("POST", "/api/records", {
    token: adminToken,
    body: {
      amount: 999.99,
      type: "income",
      category: "Bonus",
      date: "2026-04-05",
      notes: "Quarterly bonus",
    },
  });

  assert.equal(created.status, 200);
  const recordId = created.body.record.id;

  const summaryBeforeDelete = await request("GET", "/api/dashboard/summary", {
    token: adminToken,
  });
  assert.equal(summaryBeforeDelete.status, 200);
  const incomeBeforeDelete = summaryBeforeDelete.body.totalIncome;

  const updated = await request("PATCH", `/api/records/${recordId}`, {
    token: adminToken,
    body: { notes: "Updated bonus note" },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.record.notes, "Updated bonus note");

  const deleted = await request("DELETE", `/api/records/${recordId}`, {
    token: adminToken,
  });

  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.message, "Record soft-deleted successfully.");

  const getDeleted = await request("GET", `/api/records/${recordId}`, {
    token: adminToken,
  });
  assert.equal(getDeleted.status, 404);

  const listActive = await request("GET", "/api/records?search=bonus", {
    token: adminToken,
  });
  assert.equal(listActive.status, 200);
  assert.ok(listActive.body.items.every((item) => item.id !== recordId));

  const listDeleted = await request("GET", "/api/records?deleted_only=true", {
    token: adminToken,
  });
  assert.equal(listDeleted.status, 200);
  assert.ok(listDeleted.body.items.some((item) => item.id === recordId && item.isDeleted === true));

  const summaryAfterDelete = await request("GET", "/api/dashboard/summary", {
    token: adminToken,
  });
  assert.equal(summaryAfterDelete.status, 200);
  assert.equal(summaryAfterDelete.body.totalIncome, incomeBeforeDelete - 999.99);
});

test("invalid payloads return structured validation errors", async () => {
  const adminToken = await login("admin@dashboard.local", "Admin123!");

  const response = await request("POST", "/api/records", {
    token: adminToken,
    body: {
      amount: -1,
      type: "income",
      category: "",
      date: "bad-date",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "validation_error");
});

test("rate limiting returns 429 after repeated requests", async () => {
  const adminToken = await login("admin@dashboard.local", "Admin123!");
  const originalLimit = env.rateLimitMax;

  env.rateLimitMax = 2;

  const first = await request("GET", "/api/dashboard/recent-activity?limit=1", {
    token: adminToken,
  });
  const second = await request("GET", "/api/dashboard/recent-activity?limit=1", {
    token: adminToken,
  });
  const third = await request("GET", "/api/dashboard/recent-activity?limit=1", {
    token: adminToken,
  });

  env.rateLimitMax = originalLimit;

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.body.error.code, "rate_limit_exceeded");
});
