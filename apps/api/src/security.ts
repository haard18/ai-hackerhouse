/**
 * Security middleware: hardened headers, CORS allowlist, and rate limiting.
 *
 * Secrets (model + DB keys) live only in process.env on this server and are
 * never returned by any route — nothing here exposes them. The frontend talks
 * to this API over HTTP; it never sees a provider key.
 */

import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { CorsOptions } from "cors";

/** Parse ALLOWED_ORIGINS="https://a.com,https://b.com". Empty → allow all. */
function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    const allow = allowedOrigins();
    // No allowlist configured → permissive (dev). Same-origin/curl have no origin.
    if (allow.length === 0 || !origin || allow.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  maxAge: 600,
};

export const securityHeaders = helmet({
  // API serves JSON only; the strict CSP would break nothing but keep it lean.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

/** Broad limiter for all reads (the dashboard polls several endpoints / 15s). */
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate limit exceeded — slow down" },
});

/** Tighter limiter for state-changing endpoints (stake / claim). */
export const mutationLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many requests — try again shortly" },
});

/** Strict limiter for account creation to curb spam/abuse. */
export const createUserLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many accounts created — try again later" },
});
