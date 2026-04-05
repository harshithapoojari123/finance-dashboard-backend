const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/rbac");
const { resolveUser } = require("../middleware/resolveUser");
const recordService = require("../services/recordService");

const router = express.Router();

router.get(
  "/",
  authenticate,
  resolveUser,
  authorize("records:read"),
  asyncHandler(async (req, res) => {
    const records = await recordService.listRecords(req.query, req.user);
    res.json(records);
  })
);

router.post(
  "/",
  authenticate,
  resolveUser,
  authorize("records:write"),
  asyncHandler(async (req, res) => {
    const record = await recordService.createRecord(req.body || {}, req.user);
    res.json({ record });
  })
);

router.get(
  "/:recordId",
  authenticate,
  resolveUser,
  authorize("records:read"),
  asyncHandler(async (req, res) => {
    const includeDeleted = req.user.role === "admin" && String(req.query.include_deleted || "false").toLowerCase() === "true";
    const record = await recordService.getRecordById(req.params.recordId, { includeDeleted });
    res.json({ record });
  })
);

router.patch(
  "/:recordId",
  authenticate,
  resolveUser,
  authorize("records:write"),
  asyncHandler(async (req, res) => {
    const record = await recordService.updateRecord(req.params.recordId, req.body || {});
    res.json({ record });
  })
);

router.delete(
  "/:recordId",
  authenticate,
  resolveUser,
  authorize("records:write"),
  asyncHandler(async (req, res) => {
    await recordService.deleteRecord(req.params.recordId, req.user);
    res.json({ message: "Record soft-deleted successfully." });
  })
);

module.exports = router;
