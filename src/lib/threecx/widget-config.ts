/**
 * Phase 2 — config client du widget Live Chat 3CX.
 */

import {
  isThreeCxBusinessHours,
  resolvePublicCommsMode,
  THREECX_PRIORITY_PATHS,
} from "@/lib/threecx/cadrage";
import { normalizePath } from "@/i18n/routes";

export const THREECX_CALLUS_SCRIPT_URL =
  "https://downloads-global.3cx.com/downloads/livechatandtalk/v1/callus.js";

export const THREECX_CALLUS_SCRIPT_ID = "tcx-callus-js";

/** Alias EN / sous-routes pour les pages prioritaires Phase 2. */
const PRIORITY_PREFIXES = [
  ...THREECX_PRIORITY_PATHS,
  "/en",
  "/en/services",
  "/en/training",
  "/en/contact",
  "/en/pricing",
  "/en/book",
  "/quote",
  "/en/quote",
] as const;

export type ThreeCxWidgetConfig = {
  enabled: boolean;
  phonesystemUrl: string;
  party: string;
};

function envFlag(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Parse le lien Live Chat 3CX.
 * Formats acceptés :
 * - `https://pbx.3cx.fr/callus/#PartyName`
 * - `https://pbx.3cx.fr/#PartyName`
 * - party seul (`LiveChat1234`) + FQDN séparé
 */
export function parseThreeCxLiveChatLink(
  liveChatLink: string | null | undefined,
  pbxFqdn: string | null | undefined,
): Pick<ThreeCxWidgetConfig, "phonesystemUrl" | "party"> | null {
  const link = (liveChatLink ?? "").trim();
  const fqdn = (pbxFqdn ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");

  if (!link && !fqdn) return null;

  if (/^https?:\/\//i.test(link)) {
    try {
      const url = new URL(link);
      const party =
        (url.hash ? url.hash.replace(/^#/, "") : "") ||
        url.searchParams.get("party") ||
        "";
      if (!party) return null;
      return {
        phonesystemUrl: `${url.protocol}//${url.host}`,
        party,
      };
    } catch {
      return null;
    }
  }

  // party seul
  if (link && fqdn && !/\s/.test(link)) {
    return {
      phonesystemUrl: `https://${fqdn}`,
      party: link,
    };
  }

  return null;
}

/** Lit la config publique (NEXT_PUBLIC_*). */
export function getThreeCxWidgetConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ThreeCxWidgetConfig | null {
  if (!envFlag(env.NEXT_PUBLIC_THREE_CX_ENABLED)) return null;

  const parsed = parseThreeCxLiveChatLink(
    env.NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK,
    env.NEXT_PUBLIC_THREE_CX_PBX_FQDN ?? env.THREE_CX_PBX_FQDN,
  );
  if (!parsed) return null;

  return {
    enabled: true,
    ...parsed,
  };
}

export function isThreeCxPriorityPath(pathname: string): boolean {
  const path = normalizePath(pathname || "/");

  if (path === "/" || path === "/en") return true;

  return PRIORITY_PREFIXES.some((prefix) => {
    if (prefix === "/" || prefix === "/en") return false;
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

/**
 * Doit-on monter le widget 3CX maintenant ?
 * Option A : heures ouvrées + flag + pages prioritaires.
 */
export function shouldMountThreeCxWidget(opts: {
  pathname: string;
  date?: Date;
  config?: ThreeCxWidgetConfig | null;
  /** Contourne les horaires (tests locaux). */
  ignoreHours?: boolean;
}): boolean {
  const config = opts.config ?? getThreeCxWidgetConfig();
  if (!config) return false;
  if (!isThreeCxPriorityPath(opts.pathname)) return false;

  const ignore =
    opts.ignoreHours ??
    envFlag(process.env.NEXT_PUBLIC_THREE_CX_IGNORE_HOURS);

  if (ignore) return true;

  const mode = resolvePublicCommsMode(opts.date ?? new Date());
  return mode.showThreeCx && isThreeCxBusinessHours(opts.date ?? new Date());
}

/**
 * Assistant IA (Phase 7 coexistence) : toujours affiché sur le site public,
 * sauf forçage tests (`IGNORE_HOURS` + 3CX actif) pour éviter le double bubble.
 */
export function shouldShowAiAssistant(opts: {
  date?: Date;
  threeCxActive: boolean;
  ignoreHours?: boolean;
}): boolean {
  const ignore =
    opts.ignoreHours ??
    envFlag(process.env.NEXT_PUBLIC_THREE_CX_IGNORE_HOURS);

  if (ignore && opts.threeCxActive) return false;

  return resolvePublicCommsMode(opts.date ?? new Date()).showAiAssistant;
}
