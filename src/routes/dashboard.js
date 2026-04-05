const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/rbac");
const { resolveUser } = require("../middleware/resolveUser");
const dashboardService = require("../services/dashboardService");

const router = express.Router();

router.get(
  "/summary",
  authenticate,
  resolveUser,
  authorize("dashboard:read"),
  asyncHandler(async (_req, res) => {
    const summary = await dashboardService.getSummary();
    res.json(summary);
  })
);

router.get(
  "/trends",
  authenticate,
  resolveUser,
  authorize("dashboard:read"),
  asyncHandler(async (req, res) => {
    const trends = await dashboardService.getTrends(req.query.months);
    res.json(trends);
  })
);

router.get(
  "/recent-activity",
  authenticate,
  resolveUser,
  authorize("dashboard:read"),
  asyncHandler(async (req, res) => {
    const activity = await dashboardService.getRecentActivity(req.query.limit);
    res.json(activity);
  })
);

module.exports = router;
