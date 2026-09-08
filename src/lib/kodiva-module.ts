/**
 * Snapshot lecture KODIVA pour la section CRM (ADR-022).
 * Runtime : KODIVA_API_URL + KODIVA_INTERNAL_TOKEN (kodiva_int_…).
 * Écritures (suspendre un tenant, flags, support) : console KODIVA /admin, pas ici.
 */

import {
  kodivaModuleSnapshotSchema,
  type KodivaModuleClientResponse,
  type KodivaModuleSnapshot,
} from "@/lib/kodiva-module-types";

const HINT =
  "Ajoutez KODIVA_API_URL (ex. http://localhost:3001) et KODIVA_INTERNAL_TOKEN (kodiva_int_… créé dans KODIVA /admin/flags), puis redémarrez l’app.";

export function getKodivaApiUrl(): string | null {
  const raw = process.env.KODIVA_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function getKodivaInternalToken(): string | null {
  const raw = process.env.KODIVA_INTERNAL_TOKEN?.trim();
  if (!raw) return null;
  return raw;
}

export function parseKodivaModuleSnapshot(payload: unknown): KodivaModuleSnapshot {
  return kodivaModuleSnapshotSchema.parse(payload);
}

export async function fetchKodivaModuleSnapshot(): Promise<KodivaModuleClientResponse> {
  const baseUrl = getKodivaApiUrl();
  const token = getKodivaInternalToken();

  if (!baseUrl || !token) {
    return { configured: false, hint: HINT, module: null };
  }

  if (!token.startsWith("kodiva_int_")) {
    return {
      configured: false,
      hint: "KODIVA_INTERNAL_TOKEN doit commencer par kodiva_int_.",
      module: null,
    };
  }

  try {
    const res = await fetch(`${baseUrl}/v1/admin/module`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        configured: true,
        error: "KODIVA a refusé le credential interne (401/403).",
        module: null,
      };
    }

    if (!res.ok) {
      return {
        configured: true,
        error: `KODIVA a répondu ${res.status}.`,
        module: null,
      };
    }

    const json: unknown = await res.json();
    return { configured: true, module: parseKodivaModuleSnapshot(json) };
  } catch (error) {
    console.error("[kodiva-module]", error);
    const message = error instanceof Error ? error.message : "Erreur réseau KODIVA.";
    return {
      configured: true,
      error: message.includes("aborted") || message.includes("Timeout")
        ? "KODIVA ne répond pas (délai dépassé)."
        : "Impossible de joindre l’API KODIVA.",
      module: null,
    };
  }
}
