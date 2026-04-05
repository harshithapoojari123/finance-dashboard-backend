const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/rbac");
const { resolveUser } = require("../middleware/resolveUser");
const userService = require("../services/userService");

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = await userService.login(req.body || {});
    res.json(result);
  })
);

router.post(
  "/logout",
  authenticate,
  resolveUser,
  asyncHandler(async (_req, res) => {
    await userService.logout();
    res.json({ message: "Logged out successfully." });
  })
);

router.get(
  "/me",
  authenticate,
  resolveUser,
  asyncHandler(async (req, res) => {
    const user = await userService.getCurrentUser(req.user._id);
    res.json({ user });
  })
);

module.exports = router;
