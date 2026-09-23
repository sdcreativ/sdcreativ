"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, QrCode } from "lucide-react";
import type { BusinessCardRecord, BusinessCardStats } from "@/lib/business-cards";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmMyBusinessCard() {
  const [card, setCard] = useState<BusinessCardRecord | null>(null);
  const [stats, setStats] = useState<BusinessCardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-cards/mine");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lecture impossible.");
      setCard(data.card);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lecture impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-cards/mine", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Création impossible.");
      setCard(data.card);
      setMessage("Votre carte est prête.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!card) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/business-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setCard(data.card);
      setMessage("Carte enregistrée. Le QR code ne change pas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Ma carte de visite</h1>
        <p className="text-sm text-gray-text">
          Créez votre carte publique. Le nom, l&apos;e-mail, le téléphone et la photo restent ceux de votre profil.
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Créer ma carte
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon compte</p>
        <h1 className="mt-1 text-2xl font-bold">Ma carte de visite</h1>
        <p className="mt-1 text-sm text-gray-text">
          Modifiez ce que le public voit. Pour changer la photo, l&apos;e-mail ou le téléphone, passez par{" "}
          <Link href="/admin/crm/compte" className="font-semibold text-primary">
            Mon profil
          </Link>
          .
        </p>
      </div>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {stats ? (
        <p className="text-xs text-gray-text">
          {stats.total} consultations · {stats.today} aujourd&apos;hui · {stats.days7} sur 7 jours · {stats.days30}{" "}
          sur 30 jours
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <a
          href={card.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 text-xs font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Voir ma carte
        </a>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(card.publicUrl).then(() => setMessage("Lien copié."))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 text-xs font-medium"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copier le lien
        </button>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Fonction</span>
        <input
          value={card.jobTitle}
          onChange={(event) => setCard({ ...card, jobTitle: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Département</span>
        <input
          value={card.department}
          onChange={(event) => setCard({ ...card, department: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">WhatsApp</span>
        <input
          value={card.whatsapp}
          onChange={(event) => setCard({ ...card, whatsapp: event.target.value })}
          className={fieldClass}
          placeholder="+225…"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["website", "Site web"],
            ["linkedin", "LinkedIn"],
            ["github", "GitHub"],
            ["instagram", "Instagram"],
            ["twitter", "X / Twitter"],
            ["location", "Localisation"],
            ["languages", "Langues"],
            ["skills", "Compétences"],
            ["services", "Services"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block font-medium">{label}</span>
            <input
              value={card[key]}
              onChange={(event) => setCard({ ...card, [key]: event.target.value })}
              className={fieldClass}
              aria-label={label}
            />
          </label>
        ))}
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Bio</span>
        <textarea
          value={card.bio}
          rows={4}
          onChange={(event) => setCard({ ...card, bio: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showPhone}
          onChange={(event) => setCard({ ...card, showPhone: event.target.checked })}
        />
        Afficher mon téléphone
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showEmail}
          onChange={(event) => setCard({ ...card, showEmail: event.target.checked })}
        />
        Afficher mon e-mail
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showWhatsapp}
          onChange={(event) => setCard({ ...card, showWhatsapp: event.target.checked })}
        />
        Afficher WhatsApp
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showWebsite}
          onChange={(event) => setCard({ ...card, showWebsite: event.target.checked })}
        />
        Afficher le site web
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showLinkedin}
          onChange={(event) => setCard({ ...card, showLinkedin: event.target.checked })}
        />
        Afficher LinkedIn
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={card.showBio}
          onChange={(event) => setCard({ ...card, showBio: event.target.checked })}
        />
        Afficher la bio
      </label>
      <div className="flex items-center gap-4">
        <Image
          src={`/api/cards/${encodeURIComponent(card.publicToken)}/qr`}
          alt="Votre QR code"
          width={140}
          height={140}
          unoptimized
          className="h-36 w-36"
        />
        <div className="flex flex-col gap-2 text-sm font-semibold text-primary">
          <a href={`/api/cards/${encodeURIComponent(card.publicToken)}/qr?format=download`} className="inline-flex items-center gap-1">
            <QrCode className="h-4 w-4" aria-hidden />
            Télécharger PNG
          </a>
          <a href={`/api/cards/${encodeURIComponent(card.publicToken)}/qr?format=svg`}>Télécharger SVG</a>
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
    </div>
  );
}
