const { HttpError } = require("../utils/httpError");

function notFound(_req, _res, next) {
  next(new HttpError(404, "not_found", "Endpoint not found."));
}

function errorHandler(error, _req, res, _next) {
  if (error && error.name === "ValidationError") {
    return res.status(400).json({
      error: {
        code: "validation_error",
        message: error.message,
      },
    });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({
      error: {
        code: "conflict",
        message: "A resource with this unique value already exists.",
      },
    });
  }

  if (error instanceof HttpError) {
    const payload = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (error.details) {
      payload.error.details = error.details;
    }

    return res.status(error.statusCode).json(payload);
  }

  return res.status(500).json({
    error: {
      code: "internal_error",
      message: "An unexpected server error occurred.",
    },
  });
}

module.exports = {
  notFound,
  errorHandler,
};
