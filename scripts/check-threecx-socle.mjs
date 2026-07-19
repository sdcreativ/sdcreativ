#!/usr/bin/env node
/**
 * Vérifie le readiness Phase 1 3CX à partir de .env.local / process.env.
 * Usage : npm run threecx:check
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const root = resolve(import.meta.dirname, "..");
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

function normalize(value) {
  return (value ?? "").trim();
}

function looksLikeFqdn(value) {
  if (!value || value.includes("://") || value.includes("/")) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    value,
  );
}

function looksLikeLiveChatLink(value) {
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith("callto:") || value.includes("3cx")) return true;
  return value.length >= 8 && !/\s/.test(value);
}

const fqdn = normalize(process.env.THREE_CX_PBX_FQDN);
const link = normalize(process.env.NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK);
const agents = Number(normalize(process.env.THREE_CX_CONFIRMED_AGENTS) || "0");
const testsRaw = normalize(process.env.THREE_CX_CONSOLE_TESTS_PASSED).toLowerCase();
const testsOk = testsRaw === "true" || testsRaw === "1";

const checks = [
  {
    id: "pbx_fqdn",
    label: "FQDN PBX Hosted",
    ok: looksLikeFqdn(fqdn),
    detail: fqdn
      ? looksLikeFqdn(fqdn)
        ? fqdn
        : `invalide « ${fqdn} »`
      : "manquant",
  },
  {
    id: "live_chat_link",
    label: "Website Link Live Chat",
    ok: looksLikeLiveChatLink(link),
    detail: link ? (looksLikeLiveChatLink(link) ? "ok" : "invalide") : "manquant",
  },
  {
    id: "agents_min",
    label: "≥ 2 agents Web Client",
    ok: agents >= 2,
    detail: agents >= 2 ? `${agents} agents` : "THREE_CX_CONFIRMED_AGENTS < 2",
  },
  {
    id: "console_tests",
    label: "Tests chat / appel / meeting",
    ok: testsOk,
    detail: testsOk ? "ok" : "THREE_CX_CONSOLE_TESTS_PASSED ≠ true",
  },
];

const missing = checks.filter((c) => !c.ok).map((c) => c.id);
const readyForWidget =
  checks.find((c) => c.id === "pbx_fqdn").ok &&
  checks.find((c) => c.id === "live_chat_link").ok;
const ready = missing.length === 0;

console.log("3CX Phase 1 — readiness\n");
for (const c of checks) {
  console.log(`  ${c.ok ? "✓" : "✗"} ${c.label} — ${c.detail}`);
}
console.log(`\nreadyForWidget: ${readyForWidget}`);
console.log(`ready:          ${ready}`);

// Phase 8 — secrets (avertissement, n’échoue pas le readiness Phase 1)
const leaked = [];
if (normalize(process.env.NEXT_PUBLIC_THREE_CX_CRM_TOKEN)) {
  leaked.push("NEXT_PUBLIC_THREE_CX_CRM_TOKEN");
}
const serverToken = normalize(process.env.THREE_CX_CRM_TOKEN);
if (serverToken) {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (normalize(value) === serverToken) leaked.push(key);
  }
}
if (leaked.length) {
  console.error(`\n⚠ Secret 3CX exposé côté client: ${[...new Set(leaked)].join(", ")}`);
  console.error("Retirer immédiatement — voir docs/CRM-3CX-PHASE8.md");
  process.exitCode = 1;
} else if (serverToken) {
  console.log("\nsecrets: THREE_CX_CRM_TOKEN présent (serveur uniquement) ✓");
}

if (!ready) {
  console.log(`\nManquant: ${missing.join(", ")}`);
  console.log("Runbook: docs/CRM-3CX-PHASE1.md");
  process.exitCode = 1;
} else if (!leaked.length) {
  console.log("\nSocle Phase 1 OK — prêt pour Phase 2 (widget).");
}
