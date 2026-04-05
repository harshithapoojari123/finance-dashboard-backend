const { HttpError } = require("../utils/httpError");

const ROLE_PERMISSIONS = {
  viewer: ["dashboard:read"],
  analyst: ["dashboard:read", "records:read"],
  admin: ["dashboard:read", "records:read", "records:write", "users:manage"],
};

function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "authentication_error", "Authentication required."));
  }

  req.token = token;
  return next();
}

function authorize(permission) {
  return (req, _res, next) => {
    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.includes(permission)) {
      return next(
        new HttpError(403, "authorization_error", "You do not have permission to perform this action.")
      );
    }

    return next();
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  authenticate,
  authorize,
};
