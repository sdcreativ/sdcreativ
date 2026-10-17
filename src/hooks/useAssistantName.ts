"use client";

import { useEffect, useState } from "react";
import { CHATBOT } from "@/lib/constants";

let pending: Promise<string> | null = null;

/** Nom de l'assistante réglé dans l'admin (une requête par page, nom par défaut en attendant). */
export function useAssistantName(): string {
  const [name, setName] = useState<string>(CHATBOT.name);
  useEffect(() => {
    pending ??= fetch("/api/public/assistant")
      .then((r) => (r.ok ? r.json() : { name: CHATBOT.name }))
      .then((j: { name?: string }) => j.name || CHATBOT.name)
      .catch(() => {
        pending = null;
        return CHATBOT.name;
      });
    let cancelled = false;
    void pending.then((n) => {
      if (!cancelled) setName(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return name;
}

/** À appeler après l'enregistrement du nom dans l'admin. */
export function resetAssistantNameCache(): void {
  pending = null;
}
