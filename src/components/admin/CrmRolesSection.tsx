"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CRM_PERMISSIONS,
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
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

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
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement des rôles…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        Les 4 rôles système sont préconfigurés. Créez des rôles sur mesure (ex.{" "}
        <strong>comptable</strong>, <strong>support</strong>, <strong>stagiaire</strong>) avec les
        permissions adaptées.
      </p>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {roles.map((role) => (
          <li
            key={role.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray/25 bg-gray-light/20 px-4 py-3.5 transition-colors hover:border-gray/40 hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{role.label}</p>
                  {role.isSystem && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                      Système
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-gray-text">
                  {role.slug} · {role.permissions.length} permission(s) · {role.userCount}{" "}
                  utilisateur(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startEdit(role)}
                className="rounded-lg border border-gray/60 px-3 py-1.5 text-xs font-medium text-gray-text hover:bg-white hover:text-foreground"
              >
                {role.isSystem ? "Permissions" : "Modifier"}
              </button>
              {!role.isSystem && (
                <button
                  type="button"
                  onClick={() => void handleDelete(role)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/5"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-xl border border-primary/20 bg-primary-light/15 p-5"
        >
          <p className="mb-4 text-sm font-semibold text-foreground">
            {editingId ? "Modifier le rôle" : "Nouveau rôle personnalisé"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {!editingId && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Identifiant (slug)
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
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
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex. Comptable"
                required
                className={fieldClass}
                aria-label="Nom du rôle"
              />
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">
              Permissions
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CRM_PERMISSIONS.map((perm) => (
                <label
                  key={perm}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    permissions.includes(perm)
                      ? "border-primary/40 bg-primary-light/30 text-foreground"
                      : "border-gray/30 bg-white text-gray-text hover:border-gray/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="mt-0.5 h-4 w-4 rounded border-gray/60 text-primary"
                  />
                  <span>{CRM_PERMISSION_LABELS[perm]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving || !label.trim() || (!editingId && !slug.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {editingId ? "Enregistrer" : "Créer le rôle"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium text-gray-text hover:bg-white"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-light/30 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light/50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter un rôle
        </button>
      )}
    </div>
  );
}

export function PermissionsMatrix({ roles }: { roles: CrmRoleRecord[] }) {
  if (roles.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray/30">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray/30 bg-gray-light/50 text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-text">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-text"
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRM_PERMISSIONS.map((perm, i) => (
              <tr
                key={perm}
                className={cn(
                  "border-b border-gray/15 transition-colors hover:bg-primary-light/20",
                  i % 2 === 0 ? "bg-white" : "bg-gray-light/20",
                )}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {CRM_PERMISSION_LABELS[perm]}
                </td>
                {roles.map((role) => (
                  <td key={role.id} className="px-3 py-3 text-center">
                    {role.permissions.includes(perm) ? (
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                        aria-label="Autorisé"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-gray-text/30" aria-label="Refusé">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
