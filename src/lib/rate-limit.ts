import { NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };

const buckets = new Map<string, Map<string, RateLimitEntry>>();

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export const ADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

export const ADMIN_2FA_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

export const ADMIN_OTP_RESEND_RATE_LIMIT: RateLimitConfig = {
  limit: 3,
  windowMs: 15 * 60 * 1000,
};

function getBucket(namespace: string): Map<string, RateLimitEntry> {
  let bucket = buckets.get(namespace);
  if (!bucket) {
    bucket = new Map();
    buckets.set(namespace, bucket);
  }
  return bucket;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function getRateLimitStatus(
  namespace: string,
  key: string,
  { limit, windowMs }: RateLimitConfig,
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = getBucket(namespace).get(key);

  if (!entry || now > entry.resetAt) {
    return { limited: false, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return { limited: false, retryAfterSec: 0 };
}

export function recordRateLimitFailure(
  namespace: string,
  key: string,
  { windowMs }: RateLimitConfig,
): void {
  const now = Date.now();
  const bucket = getBucket(namespace);
  const entry = bucket.get(key);

  if (!entry || now > entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
}

export function clearRateLimit(namespace: string, key: string): void {
  getBucket(namespace).delete(key);
}

export function rateLimitExceededResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
