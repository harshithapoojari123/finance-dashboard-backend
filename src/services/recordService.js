const FinancialRecord = require("../models/FinancialRecord");
const { HttpError } = require("../utils/httpError");
const {
  ensureDate,
  ensureEnum,
  ensureInteger,
  ensurePositiveNumber,
  ensureString,
} = require("../middleware/validate");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeRecord(record) {
  const createdBy = record.createdBy && typeof record.createdBy === "object"
    ? {
        id: record.createdBy._id ? record.createdBy._id.toString() : record.createdBy.toString(),
        name: record.createdBy.name,
        email: record.createdBy.email,
      }
    : record.createdBy;

  const deletedBy = record.deletedBy && typeof record.deletedBy === "object"
    ? {
        id: record.deletedBy._id ? record.deletedBy._id.toString() : record.deletedBy.toString(),
        name: record.deletedBy.name,
        email: record.deletedBy.email,
      }
    : record.deletedBy;

  return {
    id: record._id.toString(),
    amount: record.amount,
    type: record.type,
    category: record.category,
    date: record.date,
    notes: record.notes,
    createdBy,
    isDeleted: Boolean(record.isDeleted),
    deletedAt: record.deletedAt,
    deletedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function listRecords(query, currentUser) {
  const filters = { isDeleted: false };

  if (query.type) {
    filters.type = ensureEnum(query.type, "type", ["income", "expense"]);
  }

  if (query.category) {
    filters.category = ensureString(query.category, "category", { maxLength: 80 });
  }

  if (query.search) {
    const search = ensureString(query.search, "search", { maxLength: 100 });
    const pattern = new RegExp(escapeRegex(search), "i");
    filters.$or = [{ category: pattern }, { notes: pattern }];
  }

  if (query.start_date || query.end_date) {
    filters.date = {};
    if (query.start_date) {
      filters.date.$gte = ensureDate(query.start_date, "start_date");
    }
    if (query.end_date) {
      filters.date.$lte = ensureDate(query.end_date, "end_date");
    }
  }

  const includeDeleted = String(query.include_deleted || "false").toLowerCase() === "true";
  const deletedOnly = String(query.deleted_only || "false").toLowerCase() === "true";

  if (currentUser?.role === "admin" && includeDeleted) {
    delete filters.isDeleted;
  }

  if (currentUser?.role === "admin" && deletedOnly) {
    filters.isDeleted = true;
  }

  const page = ensureInteger(query.page || 1, "page", { min: 1, required: true });
  const pageSize = ensureInteger(query.page_size || 10, "page_size", { min: 1, max: 100, required: true });
  const skip = (page - 1) * pageSize;

  const [items, totalItems] = await Promise.all([
    FinancialRecord.find(filters)
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    FinancialRecord.countDocuments(filters),
  ]);

  return {
    items: items.map(serializeRecord),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1,
    },
  };
}

async function getRecordById(recordId, options = {}) {
  const filters = { _id: recordId };
  if (!options.includeDeleted) {
    filters.isDeleted = false;
  }

  const record = await FinancialRecord.findOne(filters)
    .populate("createdBy", "name email")
    .populate("deletedBy", "name email");
  if (!record) {
    throw new HttpError(404, "not_found", "Financial record not found.");
  }

  return serializeRecord(record);
}

async function createRecord(payload, currentUser) {
  const amount = ensurePositiveNumber(payload.amount, "amount", { required: true });
  const type = ensureEnum(payload.type, "type", ["income", "expense"], { required: true });
  const category = ensureString(payload.category, "category", { required: true, maxLength: 80 });
  const date = ensureDate(payload.date, "date", { required: true });
  const notes = payload.notes == null
    ? ""
    : ensureString(payload.notes, "notes", { maxLength: 500, allowEmpty: true });

  const record = await FinancialRecord.create({
    amount,
    type,
    category,
    date,
    notes,
    createdBy: currentUser._id,
  });

  const populated = await FinancialRecord.findById(record._id)
    .populate("createdBy", "name email")
    .populate("deletedBy", "name email");
  return serializeRecord(populated);
}

async function updateRecord(recordId, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new HttpError(400, "validation_error", "At least one field is required for update.");
  }

  const record = await FinancialRecord.findOne({ _id: recordId, isDeleted: false })
    .populate("createdBy", "name email")
    .populate("deletedBy", "name email");
  if (!record) {
    throw new HttpError(404, "not_found", "Financial record not found.");
  }

  if (payload.amount !== undefined) {
    record.amount = ensurePositiveNumber(payload.amount, "amount");
  }
  if (payload.type !== undefined) {
    record.type = ensureEnum(payload.type, "type", ["income", "expense"]);
  }
  if (payload.category !== undefined) {
    record.category = ensureString(payload.category, "category", { maxLength: 80 });
  }
  if (payload.date !== undefined) {
    record.date = ensureDate(payload.date, "date");
  }
  if (payload.notes !== undefined) {
    record.notes = payload.notes == null
      ? ""
      : ensureString(payload.notes, "notes", { maxLength: 500, allowEmpty: true });
  }

  await record.save();
  return serializeRecord(record);
}

async function deleteRecord(recordId, currentUser) {
  const record = await FinancialRecord.findOne({ _id: recordId, isDeleted: false });
  if (!record) {
    throw new HttpError(404, "not_found", "Financial record not found.");
  }

  record.isDeleted = true;
  record.deletedAt = new Date();
  record.deletedBy = currentUser._id;
  await record.save();
}

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
