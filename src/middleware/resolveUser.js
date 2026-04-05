const User = require("../models/User");
const { verifyAccessToken } = require("../utils/token");
const { HttpError } = require("../utils/httpError");

async function resolveUser(req, _res, next) {
  try {
    const payload = verifyAccessToken(req.token);
    const user = await User.findById(payload.sub).lean();

    if (!user || user.status !== "active") {
      return next(new HttpError(401, "authentication_error", "This user is inactive or unavailable."));
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (_error) {
    return next(new HttpError(401, "authentication_error", "Invalid or expired token."));
  }
}

module.exports = { resolveUser };
