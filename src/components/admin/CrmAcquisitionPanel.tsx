"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/attribution";
import type { AcquisitionPeriod, AcquisitionReport, AcquisitionRow } from "@/lib/marketing-events";
import { fetchAcquisitionReport } from "@/lib/marketing-api";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<AcquisitionPeriod, string> = { 30: "30 jours", 90: "90 jours", 365: "12 mois" };

const LINK_PRESETS = [
  { id: "meta", label: "Publicité Facebook / Instagram", source: "facebook", medium: "paid_social" },
  { id: "google", label: "Publicité Google", source: "google", medium: "cpc" },
  { id: "social", label: "Publication (hors pub)", source: "facebook", medium: "social" },
  { id: "whatsapp", label: "Statut / groupe WhatsApp", source: "whatsapp", medium: "social" },
  { id: "partner", label: "Partenaire", source: "partenaire", medium: "partner" },
  { id: "email", label: "E-mail / newsletter", source: "newsletter", medium: "email" },
] as const;

function formatXof(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}

function rate(part: number, total: number): string | undefined {
  return total > 0 ? `${Math.round((part / total) * 100)} % des visites` : undefined;
}

/** Tableau de bord de provenance : de la visite au devis signé, par canal et par campagne. */
export function CrmAcquisitionPanel() {
  const [days, setDays] = useState<AcquisitionPeriod>(90);
  const [report, setReport] = useState<AcquisitionReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAcquisitionReport(days)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Chargement impossible.");
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const totals = useMemo(() => {
    const rows = report?.channels ?? [];
    const sum = (key: "visits" | "whatsappClicks" | "leads" | "quotesSigned" | "signedAmountXof") =>
      rows.reduce((acc, r) => acc + r[key], 0);
    return {
      visits: sum("visits"),
      whatsappClicks: sum("whatsappClicks"),
      leads: sum("leads"),
      quotesSigned: sum("quotesSigned"),
      signedAmountXof: sum("signedAmountXof"),
    };
  }, [report]);

  const loading = !error && (!report || report.days !== days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-gray-text">
          Provenance des visiteurs et des prospects. Les visites et clics WhatsApp sont des compteurs anonymes ; le
          chiffre d&apos;affaires correspond aux devis signés rattachés à un prospect.
        </p>
        <div className="flex gap-1 rounded-xl border border-gray/30 bg-gray-light/30 p-1">
          {([30, 90, 365] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                days === value ? "bg-white text-foreground shadow-sm" : "text-gray-text hover:bg-white/70",
              )}
            >
              {PERIOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Visites" value={totals.visits} />
            <Stat label="Clics WhatsApp" value={totals.whatsappClicks} hint={rate(totals.whatsappClicks, totals.visits)} />
            <Stat label="Prospects" value={totals.leads} />
            <Stat label="Devis signés" value={totals.quotesSigned} />
            <Stat label="CA signé (HT)" value={formatXof(totals.signedAmountXof)} />
          </div>

          <AcquisitionTable
            title="Par canal"
            rows={report.channels}
            label={(row) => (row.channel ? CHANNEL_LABELS[row.channel] : "Origine non renseignée")}
            empty="Aucune donnée sur la période."
          />
          <AcquisitionTable
            title="Par campagne"
            rows={report.campaigns}
            label={(row) => row.campaign ?? ""}
            empty="Aucune campagne sur la période : utilisez des liens suivis (générateur ci-dessous)."
          />
        </>
      ) : null}

      <CampaignLinkBuilder />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray/25 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-gray-text">{hint}</p>}
    </div>
  );
}

function AcquisitionTable({
  title,
  rows,
  label,
  empty,
}: {
  title: string;
  rows: AcquisitionRow[];
  label: (row: AcquisitionRow) => string;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-gray/25 bg-white shadow-sm">
      <h3 className="border-b border-gray/20 px-4 py-3 text-sm font-bold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-text">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-text">
                <th className="px-4 py-2 font-semibold">Provenance</th>
                <th className="px-3 py-2 text-right font-semibold">Visites</th>
                <th className="px-3 py-2 text-right font-semibold">Clics WhatsApp</th>
                <th className="px-3 py-2 text-right font-semibold">Prospects</th>
                <th className="px-3 py-2 text-right font-semibold">Devis</th>
                <th className="px-3 py-2 text-right font-semibold">Signés</th>
                <th className="px-4 py-2 text-right font-semibold">CA signé HT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.channel}-${row.campaign}`} className="border-t border-gray/15">
                  <td className="px-4 py-2.5 font-medium text-foreground">{label(row)}</td>
                  <td className="px-3 py-2.5 text-right">{row.visits}</td>
                  <td className="px-3 py-2.5 text-right">{row.whatsappClicks}</td>
                  <td className="px-3 py-2.5 text-right">{row.leads}</td>
                  <td className="px-3 py-2.5 text-right">{row.quotes}</td>
                  <td className="px-3 py-2.5 text-right">{row.quotesSigned}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {row.signedAmountXof > 0 ? formatXof(row.signedAmountXof) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Générateur de liens suivis (UTM) à coller dans une publicité, une publication ou un e-mail. */
function CampaignLinkBuilder() {
  const [page, setPage] = useState("/offre/audit-gratuit");
  const [preset, setPreset] = useState<(typeof LINK_PRESETS)[number]["id"]>("meta");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const selected = LINK_PRESETS.find((p) => p.id === preset) ?? LINK_PRESETS[0];
  const params = new URLSearchParams({ utm_source: selected.source, utm_medium: selected.medium });
  if (slug(campaign)) params.set("utm_campaign", slug(campaign));
  if (slug(content)) params.set("utm_content", slug(content));
  const link = `${origin}${page.startsWith("/") ? page : `/${page}`}?${params.toString()}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground";

  return (
    <section className="rounded-2xl border border-gray/25 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-foreground">Créer un lien suivi</h3>
      <p className="mt-1 text-xs text-gray-text">
        Utilisez ce lien comme destination de la publicité ou de la publication : visites, clics WhatsApp, prospects et
        devis signés seront rattachés à la campagne.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Page
          <input value={page} onChange={(e) => setPage(e.target.value)} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Canal
          <select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)} className={fieldClass}>
            {LINK_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Campagne
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="ex. audit-octobre"
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Annonce (facultatif)
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ex. video-avant-apres"
            className={fieldClass}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-gray-light/60 px-3 py-2.5 text-xs">{link}</code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </section>
  );
}
