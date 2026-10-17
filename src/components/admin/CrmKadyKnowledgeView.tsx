"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Download, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { KadyAdminTabs } from "@/components/admin/KadyAdminTabs";
import {
  CrmFormField,
  CrmFormHeader,
  CrmFormStatus,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";
import { useDialog } from "@/components/ui/DialogProvider";
import { keywordMatches } from "@/lib/chat-responder";
import { parseFetchJson } from "@/lib/fetch-json";
import { useAssistantName } from "@/hooks/useAssistantName";
import type { KadyKnowledgeInput, KadyKnowledgeLocale, KadyKnowledgeRecord } from "@/lib/kady-knowledge";
import { cn } from "@/lib/utils";

type Draft = KadyKnowledgeInput & { id?: string; keywordsText: string };

const EMPTY_DRAFT = (locale: KadyKnowledgeLocale): Draft => ({
  locale,
  title: "",
  keywords: [],
  keywordsText: "",
  answer: "",
  links: [],
  isActive: true,
});

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Mots-clés proposés à partir d'une question (mots porteurs de sens). */
function keywordsFromQuestion(question: string): string[] {
  const stop = new Set([
    "est", "les", "des", "une", "pour", "avec", "vous", "votre", "vos", "quel", "quelle", "quels", "quelles",
    "comment", "pouvez", "faites", "faire", "dans", "sur", "que", "qui", "sont", "avez", "etes", "peut", "peux",
    "faut", "quoi", "aussi", "mais", "plus", "tres", "cette", "ces", "leur", "nous", "bonjour", "merci", "svp",
    "the", "and", "you", "your", "what", "how", "can", "does", "are", "have", "with", "this", "that",
  ]);
  return [...new Set(normalize(question).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !stop.has(w)))].slice(0, 6);
}

/** Même calcul que le moteur de l'assistante : la réponse qui contient le plus de mots-clés de la question. */
function bestMatch(question: string, entries: KadyKnowledgeRecord[]): KadyKnowledgeRecord | null {
  const text = normalize(question);
  let best: KadyKnowledgeRecord | null = null;
  let bestScore = 0;
  for (const entry of entries.filter((e) => e.isActive)) {
    const score = entry.keywords.reduce((sum, kw) => {
      const k = normalize(kw);
      return keywordMatches(text, k) ? sum + (k.includes(" ") ? 3 : 1) : sum;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

/** CRM → Site → Assistante → Réponses : la base de connaissances de l'assistance virtuelle. */
export function CrmKadyKnowledgeView() {
  const { confirm } = useDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assistantName = useAssistantName();
  const [locale, setLocale] = useState<KadyKnowledgeLocale>(searchParams.get("locale") === "en" ? "en" : "fr");
  const [entries, setEntries] = useState<KadyKnowledgeRecord[] | null>(null);
  const [usingCode, setUsingCode] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fromQuestion, setFromQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [testQuestion, setTestQuestion] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/kady-knowledge?locale=${locale}`, { credentials: "include" });
      const json = await parseFetchJson<{ entries: KadyKnowledgeRecord[]; usingCode: boolean }>(res);
      setEntries(json.entries);
      setUsingCode(json.usingCode);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Arrivée depuis « Questions à améliorer » : nouvelle réponse pré-remplie avec la question.
  useEffect(() => {
    const question = searchParams.get("nouvelle");
    if (!question) return;
    const keywords = keywordsFromQuestion(question);
    setDraft({ ...EMPTY_DRAFT(searchParams.get("locale") === "en" ? "en" : "fr"), title: question.slice(0, 120), keywords, keywordsText: keywords.join(", ") });
    setFromQuestion(searchParams.get("question"));
  }, [searchParams]);

  const tested = useMemo(() => (testQuestion.trim() && entries ? bestMatch(testQuestion, entries) : null), [testQuestion, entries]);

  async function importFromCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kady-knowledge/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const { imported } = await parseFetchJson<{ imported: number }>(res);
      setMessage(`${imported} réponse(s) importée(s) : vous pouvez maintenant les modifier.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setMessage("");
    const payload: KadyKnowledgeInput = {
      locale: draft.locale,
      title: draft.title,
      keywords: draft.keywordsText.split(/[,\n]/).map((k) => k.trim()).filter(Boolean),
      answer: draft.answer,
      links: draft.links.filter((l) => l.label.trim() && l.href.trim()),
      isActive: draft.isActive,
    };
    try {
      const res = await fetch(draft.id ? `/api/admin/kady-knowledge/${draft.id}` : "/api/admin/kady-knowledge", {
        method: draft.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await parseFetchJson(res);
      if (fromQuestion) {
        await fetch(`/api/admin/kady-questions/${fromQuestion}`, { method: "DELETE", credentials: "include" }).catch(() => undefined);
        setFromQuestion(null);
        router.replace("/admin/crm/site/kady/reponses", { scroll: false });
      }
      setDraft(null);
      setMessage(`Réponse enregistrée — ${assistantName} l'utilise dès la prochaine question.`);
      if (payload.locale !== locale) setLocale(payload.locale);
      else await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: KadyKnowledgeRecord) {
    const ok = await confirm({
      title: "Supprimer cette réponse ?",
      message: `« ${entry.title} » ne sera plus utilisée par ${assistantName}. Vous pouvez aussi la désactiver.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await parseFetchJson(await fetch(`/api/admin/kady-knowledge/${entry.id}`, { method: "DELETE", credentials: "include" }));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function toggle(entry: KadyKnowledgeRecord) {
    try {
      await parseFetchJson(
        await fetch(`/api/admin/kady-knowledge/${entry.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...entry, isActive: !entry.isActive }),
        }),
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  const edit = (entry: KadyKnowledgeRecord) =>
    setDraft({
      id: entry.id,
      locale: entry.locale,
      title: entry.title,
      keywords: entry.keywords,
      keywordsText: entry.keywords.join(", "),
      answer: entry.answer,
      links: entry.links,
      isActive: entry.isActive,
    });

  return (
    <div className="space-y-6">
      <CrmFormHeader
        icon={BookOpen}
        title={`Réponses de ${assistantName}`}
        description={`Ce que ${assistantName} sait de SD CREATIV. Elle choisit la réponse dont les mots-clés correspondent le mieux à la question ; avec l'IA activée, ces réponses lui servent aussi de référence.`}
        actions={
          <CrmSecondaryButton onClick={() => setDraft(EMPTY_DRAFT(locale))} disabled={usingCode || busy}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle réponse
          </CrmSecondaryButton>
        }
      />
      <KadyAdminTabs />
      <CrmFormStatus message={message} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-gray/30 bg-gray-light/30 p-1 text-sm">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={cn("rounded-lg px-3 py-1.5 font-medium", locale === l ? "bg-white shadow-sm" : "text-gray-text")}
            >
              {l === "fr" ? "Français" : "Anglais"}
            </button>
          ))}
        </div>
        <label className="flex min-w-[280px] flex-1 items-center gap-2 sm:max-w-md">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-text">Tester</span>
          <input
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            placeholder="Tapez une question de visiteur…"
            className={crmFieldClass}
          />
        </label>
      </div>
      {testQuestion.trim() && entries && !usingCode ? (
        <p className="rounded-xl border border-gray/30 bg-white px-4 py-3 text-sm">
          {tested ? (
            <>
              {assistantName} répondrait avec <strong>{tested.title}</strong>.
            </>
          ) : (
            <>Aucune réponse ne correspond : {assistantName} donnerait sa réponse par défaut (ou l&apos;IA improviserait).</>
          )}
        </p>
      ) : null}

      {usingCode && (
        <div className="rounded-2xl border border-primary/20 bg-primary-light/30 p-5">
          <p className="font-semibold text-foreground">{assistantName} utilise actuellement ses réponses d&apos;origine.</p>
          <p className="mt-1 text-sm text-gray-text">
            Importez-les pour pouvoir les modifier, en ajouter ou en désactiver. Rien ne change pour les visiteurs tant
            que vous ne modifiez rien.
          </p>
          <button
            type="button"
            onClick={() => void importFromCode()}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Importer les réponses ({locale === "fr" ? "français" : "anglais"})
          </button>
        </div>
      )}

      {!entries ? (
        <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={cn("rounded-2xl border border-gray/25 bg-white p-4 shadow-sm", !entry.isActive && "opacity-60")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {entry.title}
                    {!entry.isActive && <span className="ml-2 text-xs font-medium text-gray-text">(désactivée)</span>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-text">{entry.answer}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.keywords.slice(0, 10).map((k) => (
                      <span key={k} className="rounded-full bg-gray-light px-2 py-0.5 text-[11px] text-gray-text">
                        {k}
                      </span>
                    ))}
                    {entry.keywords.length > 10 && (
                      <span className="text-[11px] text-gray-text">+{entry.keywords.length - 10}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void toggle(entry)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-text hover:bg-gray-light"
                  >
                    {entry.isActive ? "Désactiver" : "Activer"}
                  </button>
                  <button type="button" onClick={() => edit(entry)} className="rounded-lg p-2 hover:bg-gray-light" aria-label={`Modifier ${entry.title}`}>
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(entry)}
                    className="rounded-lg p-2 text-accent hover:bg-accent/5"
                    aria-label={`Supprimer ${entry.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void save(e)}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray/40 px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">{draft.id ? "Modifier la réponse" : "Nouvelle réponse"}</h2>
              <button type="button" onClick={() => setDraft(null)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-text" aria-hidden />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {fromQuestion && (
                <p className="rounded-xl bg-primary-light/40 px-3 py-2 text-sm">
                  Question du visiteur : <strong>{searchParams.get("nouvelle")}</strong>
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <CrmFormField label="Titre (usage interne)">
                  <input
                    id="kk-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    required
                    maxLength={120}
                    className={crmFieldClass}
                  />
                </CrmFormField>
                <CrmFormField label="Langue">
                  <select
                    id="kk-locale"
                    value={draft.locale}
                    onChange={(e) => setDraft({ ...draft, locale: e.target.value as KadyKnowledgeLocale })}
                    className={crmFieldClass}
                  >
                    <option value="fr">Français</option>
                    <option value="en">Anglais</option>
                  </select>
                </CrmFormField>
              </div>
              <CrmFormField
                label="Mots-clés"
                hint="Séparés par des virgules. Mettez les mots que les visiteurs emploient (avec et sans accents, au singulier)."
              >
                <textarea
                  id="kk-keywords"
                  value={draft.keywordsText}
                  onChange={(e) => setDraft({ ...draft, keywordsText: e.target.value })}
                  rows={2}
                  required
                  className={crmFieldClass}
                />
              </CrmFormField>
              <CrmFormField label={`Réponse de ${assistantName} (${draft.answer.length}/1200)`} hint="2 à 4 phrases, sans montant : orientez vers un devis, un rendez-vous ou WhatsApp.">
                <textarea
                  id="kk-answer"
                  value={draft.answer}
                  onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                  rows={5}
                  required
                  minLength={20}
                  maxLength={1200}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <div>
                <p className="text-sm font-medium text-foreground">Boutons sous la réponse (3 max)</p>
                <div className="mt-2 space-y-2">
                  {draft.links.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={link.label}
                        onChange={(e) => {
                          const links = [...draft.links];
                          links[i] = { ...link, label: e.target.value };
                          setDraft({ ...draft, links });
                        }}
                        placeholder="Texte du bouton"
                        aria-label="Texte du bouton"
                        maxLength={40}
                        className={crmFieldClass}
                      />
                      <input
                        value={link.href}
                        onChange={(e) => {
                          const links = [...draft.links];
                          links[i] = { ...link, href: e.target.value };
                          setDraft({ ...draft, links });
                        }}
                        placeholder="/devis"
                        aria-label="Lien du bouton"
                        className={crmFieldClass}
                      />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, links: draft.links.filter((_, j) => j !== i) })}
                        className="rounded-lg p-2 text-accent hover:bg-accent/5"
                        aria-label="Retirer le bouton"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                  {draft.links.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, links: [...draft.links, { label: "", href: "" }] })}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      + Ajouter un bouton
                    </button>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray/60"
                />
                Réponse active
              </label>
            </div>
            <div className="border-t border-gray/40 px-6 py-4">
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
