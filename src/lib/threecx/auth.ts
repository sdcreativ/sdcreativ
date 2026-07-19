/**
 * Auth + rate-limit pour `/api/integrations/3cx/*`.
 * Token : `THREE_CX_CRM_TOKEN` (Bearer) — pas la session admin.
 */

import { NextResponse } from "next/server";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
  type RateLimitConfig,
} from "@/lib/rate-limit";

const RATE_LIMIT: RateLimitConfig = {
  limit: 120,
  windowMs: 60_000,
};

export function getThreeCxCrmToken(): string | null {
  const token = process.env.THREE_CX_CRM_TOKEN?.trim();
  return token || null;
}

/** Allowlist optionnelle : `THREE_CX_IP_ALLOWLIST=1.2.3.4,5.6.7.8` */
export function getThreeCxIpAllowlist(): string[] {
  const raw = process.env.THREE_CX_IP_ALLOWLIST?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function verifyThreeCxBearer(request: Request): boolean {
  const secret = getThreeCxCrmToken();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function isThreeCxIpAllowed(request: Request): boolean {
  const allowlist = getThreeCxIpAllowlist();
  if (allowlist.length === 0) return true;
  const ip = getClientIp(request);
  return allowlist.includes(ip);
}

/**
 * Guard commun : token + allowlist + rate-limit.
 * Retourne une Response d’erreur ou null si OK.
 */
export function guardThreeCxIntegration(request: Request): Response | null {
  if (!getThreeCxCrmToken()) {
    console.error("[3cx] THREE_CX_CRM_TOKEN manquant");
    return NextResponse.json(
      { error: "Intégration 3CX non configurée." },
      { status: 503 },
    );
  }

  if (!verifyThreeCxBearer(request)) {
    console.warn("[3cx] auth refusée", { ip: getClientIp(request) });
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isThreeCxIpAllowed(request)) {
    console.warn("[3cx] IP hors allowlist", { ip: getClientIp(request) });
    return NextResponse.json({ error: "IP non autorisée." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = consumeRateLimit("threecx-crm", ip, RATE_LIMIT);
  if (rl.limited) {
    console.warn("[3cx] rate-limit", { ip, retryAfterSec: rl.retryAfterSec });
    return rateLimitExceededResponse(rl.retryAfterSec);
  }

  return null;
}

export function logThreeCxRequest(
  route: string,
  request: Request,
  extra?: Record<string, unknown>,
): void {
  console.info("[3cx]", route, {
    ip: getClientIp(request),
    method: request.method,
    ...extra,
  });
}
