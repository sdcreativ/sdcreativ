#!/usr/bin/env node
/**
 * Charge légère API 3CX — lookup uniquement (jamais create / journal).
 *
 * Usage :
 *   npm run threecx:loadtest -- --base https://sdcreativ.com --token "$THREE_CX_CRM_TOKEN"
 *   npm run threecx:loadtest -- --base http://localhost:3001 --token test --n 40 --concurrency 5
 *
 * Stop si trop de 401/403/429 pour éviter de saturer la prod.
 */

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const base = (getArg("base", process.env.THREE_CX_LOADTEST_BASE || "")).replace(/\/$/, "");
const token = getArg("token", process.env.THREE_CX_CRM_TOKEN || "");
const n = Math.min(200, Math.max(1, Number(getArg("n", "30"))));
const concurrency = Math.min(20, Math.max(1, Number(getArg("concurrency", "5"))));

if (!base || !token) {
  console.error(
    "Usage: npm run threecx:loadtest -- --base <url> --token <THREE_CX_CRM_TOKEN> [--n 30] [--concurrency 5]",
  );
  process.exit(1);
}

const url = `${base}/api/integrations/3cx/contacts/lookup?phone=%2B2250700000000`;

async function one(i) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { i, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return {
      i,
      status: 0,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function pool(total, size, worker) {
  const results = [];
  let next = 0;
  async function run() {
    while (next < total) {
      const i = next;
      next += 1;
      results.push(await worker(i));
    }
  }
  await Promise.all(Array.from({ length: size }, () => run()));
  return results;
}

console.log(`[threecx:loadtest] ${n} lookups → ${url} (concurrency ${concurrency})`);
console.log("[threecx:loadtest] endpoints create/journal : NON appelés");

const results = await pool(n, concurrency, one);
const byStatus = {};
let sumMs = 0;
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  sumMs += r.ms;
}

console.log("[threecx:loadtest] status:", byStatus);
console.log(`[threecx:loadtest] latence moyenne: ${Math.round(sumMs / results.length)} ms`);

const hardFail = (byStatus[401] ?? 0) + (byStatus[403] ?? 0);
const rateLimited = byStatus[429] ?? 0;
const serverErr = (byStatus[500] ?? 0) + (byStatus[503] ?? 0);

if (hardFail > 0) {
  console.error("[threecx:loadtest] échec auth/IP — corriger token / allowlist");
  process.exit(2);
}
if (serverErr > n * 0.2) {
  console.error("[threecx:loadtest] trop d’erreurs serveur");
  process.exit(3);
}
if (rateLimited > 0) {
  console.warn(
    `[threecx:loadtest] ${rateLimited} × 429 (rate-limit attendu au-delà de 120/min/IP) — OK`,
  );
}

console.log("[threecx:loadtest] OK");
