const User = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/token");
const { HttpError } = require("../utils/httpError");
const { ensureEmail, ensureEnum, ensureString } = require("../middleware/validate");

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function login({ email, password }) {
  const normalizedEmail = ensureEmail(email, "email", { required: true });
  const normalizedPassword = ensureString(password, "password", { required: true, maxLength: 255 });
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !verifyPassword(normalizedPassword, user.passwordHash)) {
    throw new HttpError(401, "authentication_error", "Invalid email or password.");
  }

  if (user.status !== "active") {
    throw new HttpError(401, "authentication_error", "This user is inactive and cannot sign in.");
  }

  return {
    token: signAccessToken(user),
    user: serializeUser(user),
  };
}

async function logout() {
  return;
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "not_found", "User not found.");
  }

  return serializeUser(user);
}

async function listUsers() {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: 1 });
  return users.map((user) => serializeUser(user));
}

async function getUserById(userId) {
  const user = await User.findById(userId, { passwordHash: 0 });
  if (!user) {
    throw new HttpError(404, "not_found", "User not found.");
  }

  return serializeUser(user);
}

async function createUser(payload) {
  const name = ensureString(payload.name, "name", { required: true, maxLength: 120 });
  const email = ensureEmail(payload.email, "email", { required: true });
  const password = ensureString(payload.password, "password", { required: true, maxLength: 255 });
  const role = ensureEnum(payload.role, "role", ["viewer", "analyst", "admin"], { required: true });
  const status = ensureEnum(payload.status || "active", "status", ["active", "inactive"], { required: true });

  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, "conflict", "A user with this email already exists.");
  }

  const user = await User.create({
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    status,
  });

  return serializeUser(user);
}

async function updateUser(userId, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new HttpError(400, "validation_error", "At least one field is required for update.");
  }

  const updates = {};
  if (payload.name !== undefined) {
    updates.name = ensureString(payload.name, "name", { maxLength: 120 });
  }
  if (payload.email !== undefined) {
    updates.email = ensureEmail(payload.email, "email");
  }
  if (payload.password !== undefined) {
    updates.passwordHash = hashPassword(ensureString(payload.password, "password", { maxLength: 255 }));
  }
  if (payload.role !== undefined) {
    updates.role = ensureEnum(payload.role, "role", ["viewer", "analyst", "admin"]);
  }
  if (payload.status !== undefined) {
    updates.status = ensureEnum(payload.status, "status", ["active", "inactive"]);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "not_found", "User not found.");
  }

  if (updates.email) {
    const duplicate = await User.findOne({ email: updates.email, _id: { $ne: userId } });
    if (duplicate) {
      throw new HttpError(409, "conflict", "A user with this email already exists.");
    }
  }

  Object.assign(user, updates);
  await user.save();
  return serializeUser(user);
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  listUsers,
  getUserById,
  createUser,
  updateUser,
};
