const User = require("../models/User");
const FinancialRecord = require("../models/FinancialRecord");
const { hashPassword } = require("../utils/password");

async function seedDatabase() {
  const count = await User.countDocuments();
  if (count > 0) {
    return;
  }

  const users = await User.create([
    {
      name: "Admin User",
      email: "admin@dashboard.local",
      passwordHash: hashPassword("Admin123!"),
      role: "admin",
      status: "active",
    },
    {
      name: "Analyst User",
      email: "analyst@dashboard.local",
      passwordHash: hashPassword("Analyst123!"),
      role: "analyst",
      status: "active",
    },
    {
      name: "Viewer User",
      email: "viewer@dashboard.local",
      passwordHash: hashPassword("Viewer123!"),
      role: "viewer",
      status: "active",
    },
  ]);

  const admin = users.find((item) => item.role === "admin");

  await FinancialRecord.create([
    {
      amount: 4500,
      type: "income",
      category: "Salary",
      date: new Date("2026-03-01T00:00:00.000Z"),
      notes: "Monthly salary",
      createdBy: admin._id,
    },
    {
      amount: 800,
      type: "expense",
      category: "Rent",
      date: new Date("2026-03-05T00:00:00.000Z"),
      notes: "Office rent",
      createdBy: admin._id,
    },
    {
      amount: 1200.5,
      type: "income",
      category: "Consulting",
      date: new Date("2026-03-18T00:00:00.000Z"),
      notes: "Client engagement",
      createdBy: admin._id,
    },
    {
      amount: 220.25,
      type: "expense",
      category: "Utilities",
      date: new Date("2026-03-24T00:00:00.000Z"),
      notes: "Internet and power",
      createdBy: admin._id,
    },
    {
      amount: 150,
      type: "expense",
      category: "Travel",
      date: new Date("2026-04-02T00:00:00.000Z"),
      notes: "Client meeting commute",
      createdBy: admin._id,
    },
  ]);
}

module.exports = { seedDatabase };
