const { env } = require("../config/env");
const { HttpError } = require("../utils/httpError");

const requestStore = new Map();

function cleanupBucket(bucket, windowMs, now) {
  while (bucket.length > 0 && now - bucket[0] >= windowMs) {
    bucket.shift();
  }
}

function createRateLimiter({ max, windowMs, message, keyPrefix }) {
  return (req, _res, next) => {
    const now = Date.now();
    const currentWindowMs = typeof windowMs === "function" ? windowMs(req) : windowMs;
    const currentMax = typeof max === "function" ? max(req) : max;
    const bucketKey = `${keyPrefix}:${req.ip}:${req.baseUrl}${req.path}`;
    const bucket = requestStore.get(bucketKey) || [];

    cleanupBucket(bucket, currentWindowMs, now);

    if (bucket.length >= currentMax) {
      return next(new HttpError(429, "rate_limit_exceeded", message));
    }

    bucket.push(now);
    requestStore.set(bucketKey, bucket);
    return next();
  };
}

const apiRateLimiter = createRateLimiter({
  keyPrefix: "api",
  max: () => env.rateLimitMax,
  windowMs: () => env.rateLimitWindowMs,
  message: "Too many requests. Please try again later.",
});

const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  max: () => env.authRateLimitMax,
  windowMs: () => env.rateLimitWindowMs,
  message: "Too many authentication attempts. Please try again later.",
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
};
