"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  CRM_PERMISSION_GROUPS,
  CRM_PERMISSION_LABELS,
  type CrmPermission,
} from "@/lib/crm-permissions";
import {
  createCrmRoleApi,
  deleteCrmRoleApi,
  fetchCrmRoles,
  updateCrmRoleApi,
  type CrmRoleRecord,
} from "@/lib/crm-roles-api";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  Briefcase,
  Check,
  Crown,
  Eye,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

const ROLE_STYLE: Record<
  string,
  { gradient: string; ring: string; icon: React.ReactNode; label: string }
> = {
  admin: {
    gradient: "from-amber-500/12 via-amber-400/5 to-white",
    ring: "ring-amber-200/60",
    icon: <Crown className="h-5 w-5" aria-hidden />,
    label: "Accès complet",
  },
  commercial: {
    gradient: "from-sky-500/12 via-sky-400/5 to-white",
    ring: "ring-sky-200/60",
    icon: <Briefcase className="h-5 w-5" aria-hidden />,
    label: "Ventes & leads",
  },
  project_manager: {
    gradient: "from-emerald-500/12 via-emerald-400/5 to-white",
    ring: "ring-emerald-200/60",
    icon: <UserCog className="h-5 w-5" aria-hidden />,
    label: "Projets & livraison",
  },
  readonly: {
    gradient: "from-slate-400/10 via-slate-300/5 to-white",
    ring: "ring-slate-200/60",
    icon: <Eye className="h-5 w-5" aria-hidden />,
    label: "Consultation",
  },
};

const DEFAULT_ROLE_STYLE = {
  gradient: "from-violet-500/12 via-violet-400/5 to-white",
  ring: "ring-violet-200/60",
  icon: <Shield className="h-5 w-5" aria-hidden />,
  label: "Rôle personnalisé",
};

function getRoleStyle(slug: string) {
  return ROLE_STYLE[slug] ?? DEFAULT_ROLE_STYLE;
}

type Props = {
  onRolesChange?: (roles: CrmRoleRecord[]) => void;
};

export function CrmRolesSection({ onRolesChange }: Props) {
  const { confirm } = useDialog();
  const [roles, setRoles] = useState<CrmRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [permissions, setPermissions] = useState<CrmPermission[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchCrmRoles();
      setRoles(list);
      onRolesChange?.(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les rôles.");
    } finally {
      setLoading(false);
    }
  }, [onRolesChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  function resetForm() {
    setSlug("");
    setLabel("");
    setPermissions([]);
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(role: CrmRoleRecord) {
    setEditingId(role.id);
    setSlug(role.slug);
    setLabel(role.label);
    setPermissions([...role.permissions]);
    setShowForm(true);
  }

  function togglePermission(perm: CrmPermission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  function toggleGroup(groupPerms: CrmPermission[]) {
    const allSelected = groupPerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...groupPerms])]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateCrmRoleApi(editingId, { label, permissions });
      } else {
        await createCrmRoleApi({ slug: slug.trim().toLowerCase(), label, permissions });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: CrmRoleRecord) {
    if (role.isSystem) return;
    const ok = await confirm({
      title: "Supprimer le rôle",
      message: `Supprimer le rôle « ${role.label} » ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteCrmRoleApi(role.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray/30 bg-gray-light/20 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement des rôles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Shield className="h-4 w-4 text-primary" aria-hidden />}
          label="Rôles actifs"
          value={String(roles.length)}
          detail={`${systemRoles.length} système · ${customRoles.length} personnalisé(s)`}
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-violet-600" aria-hidden />}
          label="Membres assignés"
          value={String(totalUsers)}
          detail="Utilisateurs CRM liés à un rôle"
        />
        <StatCard
          icon={<Lock className="h-4 w-4 text-emerald-600" aria-hidden />}
          label="Permissions"
          value={String(CRM_PERMISSION_GROUPS.reduce((n, g) => n + g.permissions.length, 0))}
          detail="Droits configurables par rôle"
        />
      </div>

      <p className="text-sm leading-relaxed text-gray-text">
        Les rôles système couvrent les usages courants. Créez des profils sur mesure —{" "}
        <span className="font-medium text-foreground">comptable</span>,{" "}
        <span className="font-medium text-foreground">support</span>,{" "}
        <span className="font-medium text-foreground">stagiaire</span> — avec les droits adaptés.
      </p>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {systemRoles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-text/70">
            Rôles système
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {systemRoles.map((role) => (
              <RoleCard key={role.id} role={role} onEdit={() => startEdit(role)} />
            ))}
          </div>
        </div>
      )}

      {customRoles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-text/70">
            Rôles personnalisés
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={() => startEdit(role)}
                onDelete={() => void handleDelete(role)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-gradient-to-br from-primary-light/25 to-white px-5 py-4 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:shadow-md sm:w-auto"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:scale-110" aria-hidden />
        Ajouter un rôle personnalisé
      </button>

      {showForm && (
        <RoleFormModal
          editingId={editingId}
          slug={slug}
          label={label}
          permissions={permissions}
          saving={saving}
          onSlugChange={setSlug}
          onLabelChange={setLabel}
          onTogglePermission={togglePermission}
          onToggleGroup={toggleGroup}
          onClose={resetForm}
          onSubmit={(e) => void handleSubmit(e)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-gray-light/30 px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-text">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-gray-text">{detail}</p>
    </div>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: CrmRoleRecord;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const style = getRoleStyle(role.slug);
  const coverage = Math.round(
    (role.permissions.length /
      CRM_PERMISSION_GROUPS.reduce((n, g) => n + g.permissions.length, 0)) *
      100,
  );

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray/25 bg-gradient-to-br shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
        style.gradient,
      )}
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-white/40 blur-2xl" aria-hidden />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1",
              style.ring,
            )}
          >
            {style.icon}
          </div>
          {role.isSystem ? (
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200/80">
              Système
            </span>
          ) : (
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200/80">
              Personnalisé
            </span>
          )}
        </div>

        <h4 className="mt-4 text-lg font-bold tracking-tight text-foreground">{role.label}</h4>
        <p className="mt-0.5 text-xs text-gray-text">{style.label}</p>
        <code className="mt-2 inline-block rounded-lg bg-white/70 px-2 py-0.5 font-mono text-[11px] text-gray-text ring-1 ring-gray/15">
          {role.slug}
        </code>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-gray/15">
            <Lock className="h-3 w-3 text-primary" aria-hidden />
            {role.permissions.length} permission(s)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-gray/15">
            <Users className="h-3 w-3 text-violet-600" aria-hidden />
            {role.userCount} utilisateur(s)
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-gray-text">
            <span>Couverture des droits</span>
            <span className="font-semibold text-foreground">{coverage}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-gray/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500 transition-all"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-gray/15 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray/40 bg-white/90 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {role.isSystem ? "Voir les permissions" : "Modifier"}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-xl border border-accent/20 bg-white/90 px-3 py-2 text-accent transition-colors hover:bg-accent/5"
              aria-label={`Supprimer ${role.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function RoleFormModal({
  editingId,
  slug,
  label,
  permissions,
  saving,
  onSlugChange,
  onLabelChange,
  onTogglePermission,
  onToggleGroup,
  onClose,
  onSubmit,
}: {
  editingId: string | null;
  slug: string;
  label: string;
  permissions: CrmPermission[];
  saving: boolean;
  onSlugChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onTogglePermission: (perm: CrmPermission) => void;
  onToggleGroup: (perms: CrmPermission[]) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray/20 bg-gradient-to-r from-gray-light/40 to-white px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-text">
              {editingId ? "Édition" : "Création"}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {editingId ? "Modifier le rôle" : "Nouveau rôle personnalisé"}
            </h2>
            <p className="mt-1 text-sm text-gray-text">
              Cochez uniquement les droits nécessaires — principe du moindre privilège.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray/30 p-2 text-gray-text transition-colors hover:bg-gray-light/60 hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {!editingId && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Identifiant (slug)
                </span>
                <input
                  value={slug}
                  onChange={(e) =>
                    onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="ex. comptable"
                  required
                  pattern="[a-z][a-z0-9_]*"
                  className={fieldClass}
                  aria-label="Slug du rôle"
                />
              </label>
            )}
            <label className={cn("block", editingId && "sm:col-span-2")}>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Nom affiché
              </span>
              <input
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="ex. Comptable"
                required
                className={fieldClass}
                aria-label="Nom du rôle"
              />
            </label>
          </div>

          <div className="mt-6 space-y-4">
            {CRM_PERMISSION_GROUPS.map((group) => {
              const selected = group.permissions.filter((p) => permissions.includes(p)).length;
              const allSelected = selected === group.permissions.length;

              return (
                <fieldset
                  key={group.id}
                  className="overflow-hidden rounded-xl border border-gray/25 bg-gray-light/15"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-gray/20 bg-white/80 px-4 py-3">
                    <legend className="text-sm font-semibold text-foreground">{group.label}</legend>
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.permissions)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {allSelected ? "Tout décocher" : "Tout cocher"}
                    </button>
                  </div>
                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all",
                          permissions.includes(perm)
                            ? "border-primary/35 bg-primary-light/25 text-foreground shadow-sm"
                            : "border-transparent bg-white text-gray-text hover:border-gray/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm)}
                          onChange={() => onTogglePermission(perm)}
                          className="mt-0.5 h-4 w-4 rounded border-gray/60 text-primary"
                        />
                        <span>{CRM_PERMISSION_LABELS[perm]}</span>
                      </label>
                    ))}
                  </div>
                  <p className="border-t border-gray/15 px-4 py-2 text-[11px] text-gray-text">
                    {selected}/{group.permissions.length} sélectionnée(s)
                  </p>
                </fieldset>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray/20 bg-gray-light/20 px-6 py-4">
          <p className="text-xs text-gray-text">
            <span className="font-semibold text-foreground">{permissions.length}</span> permission(s)
            active(s)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium text-gray-text hover:bg-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !label.trim() || (!editingId && !slug.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {editingId ? "Enregistrer" : "Créer le rôle"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function PermissionsMatrix({ roles }: { roles: CrmRoleRecord[] }) {
  if (roles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray/40 bg-gray-light/20 px-4 py-10 text-center text-sm text-gray-text">
        Chargez les rôles pour afficher la matrice.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray/30 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray/30 bg-[#071525] text-left text-white">
              <th className="sticky left-0 z-10 min-w-[220px] bg-[#071525] px-4 py-3.5 text-xs font-bold uppercase tracking-wide">
                Permission
              </th>
              {roles.map((role) => {
                const style = getRoleStyle(role.slug);
                return (
                  <th
                    key={role.id}
                    className="min-w-[100px] px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide"
                  >
                    <span className="inline-flex flex-col items-center gap-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                        {style.icon}
                      </span>
                      <span className="max-w-[88px] truncate">{role.label}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CRM_PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.id}>
                <tr className="bg-gray-light/50">
                  <td
                    colSpan={roles.length + 1}
                    className="sticky left-0 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-text"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((perm, i) => (
                  <tr
                    key={perm}
                    className={cn(
                      "border-b border-gray/10 transition-colors hover:bg-primary-light/15",
                      i % 2 === 0 ? "bg-white" : "bg-gray-light/15",
                    )}
                  >
                    <td className="sticky left-0 z-[1] bg-inherit px-4 py-3 font-medium text-foreground shadow-[4px_0_12px_-6px_rgba(0,0,0,0.08)]">
                      {CRM_PERMISSION_LABELS[perm]}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-3 py-3 text-center">
                        {role.permissions.includes(perm) ? (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80"
                            aria-label="Autorisé"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                          </span>
                        ) : (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-light/80 text-gray-text/25"
                            aria-label="Refusé"
                          >
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
