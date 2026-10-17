"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircleQuestion, ThumbsDown } from "lucide-react";
import { KadyAdminTabs } from "@/components/admin/KadyAdminTabs";
import { CrmFormHeader, CrmFormStatus } from "@/components/admin/crm-site-form-ui";
import { parseFetchJson } from "@/lib/fetch-json";
import { useAssistantName } from "@/hooks/useAssistantName";
import type { QuestionToImprove } from "@/lib/chat-conversations";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** CRM → Site → Assistante → Questions à améliorer : ce que l'assistante n'a pas su traiter, à transformer en réponses. */
export function CrmKadyQuestionsView() {
  const [questions, setQuestions] = useState<QuestionToImprove[] | null>(null);
  const [message, setMessage] = useState("");
  const assistantName = useAssistantName();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/kady-questions", { credentials: "include" });
      setQuestions((await parseFetchJson<{ questions: QuestionToImprove[] }>(res)).questions);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function dismiss(q: QuestionToImprove) {
    setQuestions((prev) => prev?.filter((x) => x.messageId !== q.messageId) ?? prev);
    try {
      await parseFetchJson(await fetch(`/api/admin/kady-questions/${q.messageId}`, { method: "DELETE", credentials: "include" }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mise à jour impossible.");
      void load();
    }
  }

  return (
    <div className="space-y-6">
      <CrmFormHeader
        icon={MessageCircleQuestion}
        title="Questions à améliorer"
        description={`Questions des 90 derniers jours pour lesquelles ${assistantName} n'a pas trouvé de réponse, ou dont la réponse a reçu un 👎. Ajoutez une réponse : ${assistantName} saura y répondre la prochaine fois.`}
      />
      <KadyAdminTabs />
      <CrmFormStatus message={message} />

      {!questions ? (
        <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : questions.length === 0 ? (
        <p className="rounded-2xl border border-gray/25 bg-white p-6 text-sm text-gray-text">
          Rien à traiter : {assistantName} a trouvé une réponse à toutes les questions récentes.
        </p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.messageId} className="rounded-2xl border border-gray/25 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-text">
                <span>{formatWhen(q.createdAt)}</span>
                {q.locale === "en" && <span className="rounded-full bg-gray-light px-2 py-0.5">anglais</span>}
                <span
                  className={
                    q.reason === "thumbs_down"
                      ? "inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent"
                      : "rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"
                  }
                >
                  {q.reason === "thumbs_down" ? (
                    <>
                      <ThumbsDown className="h-3 w-3" aria-hidden /> Réponse jugée inutile
                    </>
                  ) : (
                    "Pas de réponse trouvée"
                  )}
                </span>
              </div>
              <p className="mt-2 font-semibold text-foreground">« {q.question} »</p>
              <details className="mt-1 text-sm text-gray-text">
                <summary className="cursor-pointer select-none">Réponse donnée par {assistantName}</summary>
                <p className="mt-1 whitespace-pre-wrap">{q.answer}</p>
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/crm/site/kady/reponses?nouvelle=${encodeURIComponent(q.question)}&question=${q.messageId}&locale=${q.locale === "en" ? "en" : "fr"}`}
                  className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Créer une réponse
                </Link>
                <button
                  type="button"
                  onClick={() => void dismiss(q)}
                  className="rounded-xl border border-gray/40 px-3 py-2 text-sm font-medium text-gray-text hover:bg-gray-light"
                >
                  Ignorer
                </button>
                <Link href={`/admin/crm/conversations?id=${q.conversationId}`} className="text-sm text-primary hover:underline">
                  Voir la conversation
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
