const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/rbac");
const { resolveUser } = require("../middleware/resolveUser");
const userService = require("../services/userService");

const router = express.Router();

router.get(
  "/",
  authenticate,
  resolveUser,
  authorize("users:manage"),
  asyncHandler(async (_req, res) => {
    const items = await userService.listUsers();
    res.json({ items });
  })
);

router.post(
  "/",
  authenticate,
  resolveUser,
  authorize("users:manage"),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body || {});
    res.json({ user });
  })
);

router.get(
  "/:userId",
  authenticate,
  resolveUser,
  authorize("users:manage"),
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.userId);
    res.json({ user });
  })
);

router.patch(
  "/:userId",
  authenticate,
  resolveUser,
  authorize("users:manage"),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.userId, req.body || {});
    res.json({ user });
  })
);

module.exports = router;
