"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import type { PublicTeamMemberRecord } from "@/lib/public-team-members";
import {
  createTeamMemberApi,
  deleteTeamMemberApi,
  fetchTeamMembersAdmin,
  importStaticTeamMembersApi,
  reorderTeamMemberApi,
  updateTeamMemberApi,
} from "@/lib/public-team-api";
import { TeamMemberImageField } from "@/components/admin/TeamMemberImageField";
import { CrmFormField, crmFieldClass } from "@/components/admin/crm-site-form-ui";
import { useDialog } from "@/components/ui/DialogProvider";
import { DEFAULT_IMAGE_POSITION, normalizeImagePosition } from "@/lib/image-position";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type MemberForm = {
  name: string;
  role: string;
  missions: string;
  initials: string;
  image: string;
  imageAlt: string;
  imagePosition: string;
  locale: "fr" | "en";
  isVisible: boolean;
};

const emptyForm = (): MemberForm => ({
  name: "",
  role: "",
  missions: "",
  initials: "",
  image: "",
  imageAlt: "",
  imagePosition: DEFAULT_IMAGE_POSITION,
  locale: "fr",
  isVisible: true,
});

function recordToForm(member: PublicTeamMemberRecord): MemberForm {
  return {
    name: member.name,
    role: member.role,
    missions: member.missions,
    initials: member.initials,
    image: member.image,
    imageAlt: member.imageAlt,
    imagePosition: member.imagePosition,
    locale: member.locale as "fr" | "en",
    isVisible: member.isVisible,
  };
}

export function CrmTeamMembersView() {
  const { confirm, alert } = useDialog();
  const [members, setMembers] = useState<PublicTeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localeFilter, setLocaleFilter] = useState<"fr" | "en" | "all">("fr");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTeamMembersAdmin(
        localeFilter === "all" ? undefined : localeFilter,
      );
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'équipe.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [localeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  function openEdit(member: PublicTeamMemberRecord) {
    setCreating(false);
    setEditingId(member.id);
    setForm(recordToForm(member));
    setMessage("");
  }

  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        imagePosition: normalizeImagePosition(form.imagePosition),
      };
      if (creating) {
        const member = await createTeamMemberApi(payload);
        setMembers((prev) => [...prev, member].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Membre ajouté — le site public sera mis à jour sous quelques secondes.");
      } else if (editingId) {
        const member = await updateTeamMemberApi(editingId, payload);
        setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
        closeForm();
        setMessage("Membre mis à jour — le site public sera mis à jour sous quelques secondes.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: "Supprimer ce membre ?",
      message: `« ${name} » sera retiré de la section équipe du site public.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deleteTeamMemberApi(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVisible(member: PublicTeamMemberRecord) {
    setBusyId(member.id);
    try {
      const updated = await updateTeamMemberApi(member.id, { isVisible: !member.isVisible });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await reorderTeamMemberApi(id, direction);
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Réordonnancement impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleImportStatic() {
    const ok = await confirm({
      title: "Importer l'équipe statique ?",
      message:
        "Les 4 membres définis dans le code seront ajoutés en base (sans écraser les existants).",
      confirmLabel: "Importer",
    });
    if (!ok) return;

    setImporting(true);
    setMessage("");
    try {
      const result = await importStaticTeamMembersApi();
      await load();
      setMessage(
        `Import terminé : ${result.imported} ajouté(s), ${result.skipped} ignoré(s).`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-primary" aria-hidden />
            Équipe publique
          </h1>
          <p className="mt-1 text-sm text-gray-text">
            Gérez la section « Les visages derrière SD CREATIV » sur l&apos;accueil et la page À
            propos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleImportStatic()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Importer depuis le code
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </button>
        </div>
      </div>

      <p className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Cette section est distincte des <strong>utilisateurs CRM</strong> (Paramètres → Équipe).
        Ici, vous gérez uniquement les profils affichés sur le site vitrine.
      </p>

      <div className="flex gap-2">
        {(["fr", "en", "all"] as const).map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocaleFilter(loc)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              localeFilter === loc
                ? "bg-primary text-white"
                : "bg-gray-light text-gray-text hover:bg-gray/20",
            )}
          >
            {loc === "all" ? "Toutes langues" : loc.toUpperCase()}
          </button>
        ))}
      </div>

      {message && (
        <p
          className={cn(
            "text-sm",
            message.includes("Impossible") || message.includes("Erreur")
              ? "text-red-600"
              : "text-emerald-700",
          )}
          role="status"
        >
          {message}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-text/50" aria-hidden />
          <p className="mt-3 text-sm text-gray-text">
            Aucun membre en base. Importez l&apos;équipe statique ou ajoutez un membre manuellement.
          </p>
          <p className="mt-1 text-xs text-gray-text/80">
            Tant qu&apos;aucun membre n&apos;est en base, le site affiche les données du fichier
            code.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member, index) => (
            <article
              key={member.id}
              className={cn(
                "flex gap-4 rounded-2xl border bg-white p-4 shadow-sm",
                member.isVisible ? "border-gray/60" : "border-gray/40 opacity-70",
              )}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-primary-light">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    style={{ objectPosition: member.imagePosition }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-light text-xs font-bold text-primary">
                    {member.initials}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-foreground">{member.name}</h2>
                    <p className="text-sm font-semibold text-primary">{member.role}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-text">{member.missions}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-gray-light px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-text">
                    {member.locale}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(member)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleVisible(member)}
                    disabled={busyId === member.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60"
                  >
                    {member.isVisible ? (
                      <>
                        <EyeOff className="h-3 w-3" aria-hidden />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" aria-hidden />
                        Afficher
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReorder(member.id, "up")}
                    disabled={busyId === member.id || index === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"
                    title="Monter"
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReorder(member.id, "down")}
                    disabled={busyId === member.id || index === members.length - 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"
                    title="Descendre"
                  >
                    <ArrowDown className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(member.id, member.name)}
                    disabled={busyId === member.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-member-form-title"
          >
            <h2 id="team-member-form-title" className="text-lg font-bold text-foreground">
              {creating ? "Nouveau membre" : "Modifier le membre"}
            </h2>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
              <TeamMemberImageField
                value={form.image}
                imagePosition={form.imagePosition}
                onChange={(image) => setForm((prev) => ({ ...prev, image }))}
                onPositionChange={(imagePosition) =>
                  setForm((prev) => ({ ...prev, imagePosition }))
                }
              />

              <CrmFormField label="Nom complet">
                <input
                  required
                  aria-label="Nom complet"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={crmFieldClass}
                />
              </CrmFormField>

              <CrmFormField label="Rôle / titre">
                <input
                  required
                  aria-label="Rôle / titre"
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className={crmFieldClass}
                />
              </CrmFormField>

              <CrmFormField label="Missions / description">
                <textarea
                  required
                  aria-label="Missions / description"
                  rows={4}
                  value={form.missions}
                  onChange={(e) => setForm((prev) => ({ ...prev, missions: e.target.value }))}
                  className={crmFieldClass}
                />
              </CrmFormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <CrmFormField label="Initiales (optionnel)">
                  <input
                    aria-label="Initiales (optionnel)"
                    value={form.initials}
                    onChange={(e) => setForm((prev) => ({ ...prev, initials: e.target.value }))}
                    className={crmFieldClass}
                    placeholder="Auto"
                    maxLength={8}
                  />
                </CrmFormField>
                <CrmFormField label="Langue">
                  <select
                    aria-label="Langue"
                    value={form.locale}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        locale: e.target.value as "fr" | "en",
                      }))
                    }
                    className={crmFieldClass}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </CrmFormField>
              </div>

              <CrmFormField label="Texte alternatif photo">
                <input
                  required
                  aria-label="Texte alternatif photo"
                  value={form.imageAlt}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageAlt: e.target.value }))}
                  className={crmFieldClass}
                />
              </CrmFormField>

              <label htmlFor="team-member-visible" className="flex items-center gap-2 text-sm">
                <input
                  id="team-member-visible"
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isVisible: e.target.checked }))
                  }
                  className="rounded border-gray/60 text-primary focus:ring-primary/30"
                />
                Visible sur le site public
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
