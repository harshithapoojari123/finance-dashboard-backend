const { HttpError } = require("../utils/httpError");

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function ensureString(value, field, { required = false, maxLength = null, allowEmpty = false } = {}) {
  if (value == null || value === "") {
    if (required) {
      throw new HttpError(400, "validation_error", `Field '${field}' is required.`);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "validation_error", `Field '${field}' must be a string.`);
  }

  const result = value.trim();
  if (!allowEmpty && result.length === 0) {
    throw new HttpError(400, "validation_error", `Field '${field}' cannot be empty.`);
  }

  if (maxLength && result.length > maxLength) {
    throw new HttpError(400, "validation_error", `Field '${field}' must not exceed ${maxLength} characters.`);
  }

  return result;
}

function ensureEnum(value, field, allowed, options = {}) {
  const result = ensureString(value, field, options);
  if (result === undefined) {
    return undefined;
  }

  const normalized = result.toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be one of: ${allowed.join(", ")}.`);
  }

  return normalized;
}

function ensureEmail(value, field = "email", options = {}) {
  const result = ensureString(value, field, options);
  if (result === undefined) {
    return undefined;
  }

  if (!isEmail(result)) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be a valid email address.`);
  }

  return result.toLowerCase();
}

function ensurePositiveNumber(value, field, options = {}) {
  if (value == null || value === "") {
    if (options.required) {
      throw new HttpError(400, "validation_error", `Field '${field}' is required.`);
    }
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be a valid number.`);
  }

  if (numeric <= 0) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be greater than zero.`);
  }

  return numeric;
}

function ensureDate(value, field, options = {}) {
  const result = ensureString(value, field, options);
  if (result === undefined) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new HttpError(400, "validation_error", `Field '${field}' must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${result}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be a valid date.`);
  }

  return parsed;
}

function ensureInteger(value, field, { required = false, min = null, max = null } = {}) {
  if (value == null || value === "") {
    if (required) {
      throw new HttpError(400, "validation_error", `Field '${field}' is required.`);
    }
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be an integer.`);
  }

  if (min != null && numeric < min) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be at least ${min}.`);
  }

  if (max != null && numeric > max) {
    throw new HttpError(400, "validation_error", `Field '${field}' must be at most ${max}.`);
  }

  return numeric;
}

module.exports = {
  ensureString,
  ensureEnum,
  ensureEmail,
  ensurePositiveNumber,
  ensureDate,
  ensureInteger,
};
