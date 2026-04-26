import rateLimit from "express-rate-limit";

/**
 * Middleware: generalLimiter
 *
 * Rate limiter for general API routes.
 * Limits requests per IP address.
 *
 * Limits:
 * - 100 requests per 15 minutes
 *
 * Behavior:
 * - Returns error message when limit is exceeded
 */

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, //  100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware: authLimiter
 *
 * Rate limiter for authentication routes.
 * Prevents brute-force login attempts.
 *
 * Limits:
 * - 5 requests per 15 minutes
 * - Skips successful requests
 *
 * Behavior:
 * - Returns error message when limit is exceeded
 */

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, //  5 requests per windowMs
  skipSuccessfulRequests: true,
  message: "Too many login attempts, please try again later.",
});
