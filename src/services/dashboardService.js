const FinancialRecord = require("../models/FinancialRecord");
const { ensureInteger } = require("../middleware/validate");

async function getSummary() {
  const [totals] = await FinancialRecord.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
      },
    },
  ]);

  const categoryTotals = await FinancialRecord.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { total: -1, "_id.category": 1 } },
    {
      $project: {
        _id: 0,
        category: "$_id.category",
        type: "$_id.type",
        total: { $round: ["$total", 2] },
      },
    },
  ]);

  const recentActivity = await FinancialRecord.find({ isDeleted: false })
    .sort({ date: -1, createdAt: -1 })
    .limit(5)
    .populate("createdBy", "name email");

  const totalIncome = Number((totals?.totalIncome || 0).toFixed(2));
  const totalExpenses = Number((totals?.totalExpenses || 0).toFixed(2));

  return {
    totalIncome,
    totalExpenses,
    netBalance: Number((totalIncome - totalExpenses).toFixed(2)),
    categoryTotals,
    recentActivity: recentActivity.map((item) => ({
      id: item._id.toString(),
      amount: item.amount,
      type: item.type,
      category: item.category,
      date: item.date,
      notes: item.notes,
      createdBy: item.createdBy
        ? {
            id: item.createdBy._id.toString(),
            name: item.createdBy.name,
            email: item.createdBy.email,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

async function getRecentActivity(limitRaw) {
  const limit = ensureInteger(limitRaw || 5, "limit", { min: 1, max: 50, required: true });
  const items = await FinancialRecord.find({ isDeleted: false })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name email");

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      amount: item.amount,
      type: item.type,
      category: item.category,
      date: item.date,
      notes: item.notes,
      createdBy: item.createdBy
        ? {
            id: item.createdBy._id.toString(),
            name: item.createdBy.name,
            email: item.createdBy.email,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

async function getTrends(monthsRaw) {
  const months = ensureInteger(monthsRaw || 6, "months", { min: 1, max: 24, required: true });
  const trends = await FinancialRecord.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$date" } },
        },
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
      },
    },
    { $sort: { "_id.month": -1 } },
    { $limit: months },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        income: { $round: ["$income", 2] },
        expenses: { $round: ["$expenses", 2] },
        net: { $round: [{ $subtract: ["$income", "$expenses"] }, 2] },
      },
    },
    { $sort: { month: 1 } },
  ]);

  return { items: trends };
}

module.exports = {
  getSummary,
  getRecentActivity,
  getTrends,
};
