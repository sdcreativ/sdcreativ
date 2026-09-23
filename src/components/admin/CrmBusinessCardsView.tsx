"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Copy, ExternalLink, Loader2, QrCode, RefreshCw } from "lucide-react";
import type { BusinessCardRecord, BusinessCardStats, CardCandidate } from "@/lib/business-cards";
import { resolveImageDisplayUrl } from "@/lib/image-url";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type EditorCard = BusinessCardRecord;

const FLAGS: Array<{ key: keyof EditorCard; label: string }> = [
  { key: "showPhoto", label: "Photo" },
  { key: "showEmail", label: "E-mail" },
  { key: "showPhone", label: "Téléphone" },
  { key: "showWhatsapp", label: "WhatsApp" },
  { key: "showWebsite", label: "Site web" },
  { key: "showLinkedin", label: "LinkedIn" },
  { key: "showGithub", label: "GitHub" },
  { key: "showInstagram", label: "Instagram" },
  { key: "showTwitter", label: "X / Twitter" },
  { key: "showLocation", label: "Localisation" },
  { key: "showBio", label: "Bio" },
  { key: "showSkills", label: "Compétences" },
  { key: "showServices", label: "Services" },
];

function payload(card: EditorCard) {
  return {
    jobTitle: card.jobTitle,
    department: card.department,
    company: card.company,
    whatsapp: card.whatsapp,
    website: card.website,
    linkedin: card.linkedin,
    github: card.github,
    instagram: card.instagram,
    twitter: card.twitter,
    location: card.location,
    languages: card.languages,
    bio: card.bio,
    skills: card.skills,
    services: card.services,
    showPhone: card.showPhone,
    showWhatsapp: card.showWhatsapp,
    showEmail: card.showEmail,
    showWebsite: card.showWebsite,
    showLinkedin: card.showLinkedin,
    showGithub: card.showGithub,
    showInstagram: card.showInstagram,
    showTwitter: card.showTwitter,
    showLocation: card.showLocation,
    showBio: card.showBio,
    showSkills: card.showSkills,
    showServices: card.showServices,
    showPhoto: card.showPhoto,
    active: card.active,
    indexable: card.indexable,
  };
}

export function CrmBusinessCardsView() {
  const [cards, setCards] = useState<EditorCard[]>([]);
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [userId, setUserId] = useState("");
  const [editing, setEditing] = useState<EditorCard | null>(null);
  const [stats, setStats] = useState<BusinessCardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-cards");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lecture impossible.");
      setCards(data.cards ?? []);
      setCandidates(data.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lecture impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCard(card: EditorCard) {
    setEditing(card);
    setStats(null);
    const res = await fetch(`/api/admin/business-cards/${card.id}`);
    const data = await res.json();
    if (res.ok) {
      setEditing(data.card);
      setStats(data.stats);
    }
  }

  async function createCard() {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Création impossible.");
      setMessage("Carte créée. Le QR reste valable tant que le lien n'est pas régénéré.");
      setUserId("");
      await load();
      setEditing(data.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/business-cards/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(editing)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setEditing(data.card);
      setMessage("Carte enregistrée.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!editing) return;
    const ok = window.confirm(
      "Attention : l'ancien lien et l'ancien QR code ne fonctionneront plus. Continuer ?",
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/business-cards/${editing.id}/token`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Régénération impossible.");
      setEditing(data.card);
      setMessage("Nouveau lien public généré.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Régénération impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Lien copié.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartes de visite</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-text">
            Une carte par compte CRM. Le QR code pointe vers un lien permanent. Le nom, l&apos;e-mail,
            le téléphone et la photo viennent du profil du membre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualiser
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray/40 bg-white p-4">
        <label className="min-w-64 flex-1 text-sm">
          <span className="mb-1 block font-medium">Créer la carte d&apos;un membre</span>
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className={fieldClass}
            aria-label="Membre"
          >
            <option value="">Choisir un membre</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {candidate.email}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!userId || saving}
          onClick={() => void createCard()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Créer
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray/40 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray/30 text-xs uppercase tracking-wide text-gray-text">
              <tr>
                <th className="px-4 py-3">Membre</th>
                <th className="px-4 py-3">Fonction</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Scans</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-gray/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {card.photoUrl ? (
                        <Image
                          src={resolveImageDisplayUrl(card.photoUrl)}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-light text-xs font-bold">
                          {card.name.slice(0, 2)}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold">{card.name}</span>
                        <span className="text-xs text-gray-text">{card.department || card.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{card.jobTitle || "—"}</td>
                  <td className="px-4 py-3">{card.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3">{card.viewCount}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void openCard(card)}
                      className="font-semibold text-primary"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-text">
                    Aucune carte pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <section className="space-y-4 rounded-2xl border border-gray/40 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{editing.name}</h2>
              <p className="text-sm text-gray-text">
                {editing.email}
                {editing.phone ? ` · ${editing.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={editing.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 text-xs font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Voir
              </a>
              <button
                type="button"
                onClick={() => void copyUrl(editing.publicUrl)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 text-xs font-medium"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copier l&apos;URL
              </button>
            </div>
          </div>

          {stats ? (
            <p className="text-xs text-gray-text">
              Consultations : {stats.total} au total · {stats.today} aujourd&apos;hui · {stats.days7} sur 7
              jours · {stats.days30} sur 30 jours. Mobile {stats.mobile}, tablette {stats.tablet}, ordinateur{" "}
              {stats.desktop}.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["jobTitle", "Fonction"],
                ["department", "Département"],
                ["company", "Entreprise"],
                ["whatsapp", "WhatsApp"],
                ["website", "Site web"],
                ["linkedin", "LinkedIn"],
                ["github", "GitHub"],
                ["instagram", "Instagram"],
                ["twitter", "X / Twitter"],
                ["location", "Localisation"],
                ["languages", "Langues"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block font-medium">{label}</span>
                <input
                  value={String(editing[key] ?? "")}
                  onChange={(event) =>
                    setEditing((current) => (current ? { ...current, [key]: event.target.value } : current))
                  }
                  className={fieldClass}
                  aria-label={label}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Bio</span>
            <textarea
              value={editing.bio}
              rows={3}
              onChange={(event) => setEditing({ ...editing, bio: event.target.value })}
              className={fieldClass}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Compétences (séparées par des virgules)</span>
              <input
                value={editing.skills}
                onChange={(event) => setEditing({ ...editing, skills: event.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Services</span>
              <input
                value={editing.services}
                onChange={(event) => setEditing({ ...editing, services: event.target.value })}
                className={fieldClass}
              />
            </label>
          </div>

          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="mb-1 text-sm font-medium">Visible sur la carte publique</legend>
            {FLAGS.map((flag) => (
              <label key={flag.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editing[flag.key])}
                  onChange={(event) =>
                    setEditing({ ...editing, [flag.key]: event.target.checked })
                  }
                />
                {flag.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
              />
              Carte active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.indexable}
                onChange={(event) => setEditing({ ...editing, indexable: event.target.checked })}
              />
              Indexable par Google
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <Image
              src={`/api/cards/${encodeURIComponent(editing.publicToken)}/qr`}
              alt="QR code de la carte"
              width={140}
              height={140}
              unoptimized
              className="h-36 w-36 rounded-xl border border-gray/30 bg-white"
            />
            <div className="flex flex-col gap-2 text-sm">
              <a
                className="inline-flex items-center gap-1 font-semibold text-primary"
                href={`/api/cards/${encodeURIComponent(editing.publicToken)}/qr?format=download`}
              >
                <QrCode className="h-4 w-4" aria-hidden />
                Télécharger PNG
              </a>
              <a
                className="font-semibold text-primary"
                href={`/api/cards/${encodeURIComponent(editing.publicToken)}/qr?format=svg`}
              >
                Télécharger SVG
              </a>
              <button type="button" onClick={() => void regenerate()} className="text-left text-red-600">
                Régénérer le lien public
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
