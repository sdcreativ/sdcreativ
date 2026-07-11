"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_STYLES,
} from "@/content/settings-labels";
import type { IntegrationHealth, SettingsHealth } from "@/lib/settings-health";
import {
  createCrmUserApi,
  deleteCrmUserApi,
  fetchCrmUsers,
  resendUserInvitationApi,
  updateCrmUserApi,
} from "@/lib/crm-users-api";
import {
  AuditLogSection,
  BrandingSection,
  EmailTemplatesSection,
} from "@/components/admin/CrmSettingsExtras";
import { CrmRolesSection, PermissionsMatrix } from "@/components/admin/CrmRolesSection";
import { CrmSecuritySection } from "@/components/admin/CrmSecuritySection";
import { SitePublicSection } from "@/components/admin/CrmSitePublicSection";
import { PaymentSettingsSection } from "@/components/admin/PaymentSettingsSection";
import type { CrmUser } from "@/lib/crm-users";
import { fetchPortalAccounts, fetchSettingsHealth } from "@/lib/settings-api";
import type { CrmRoleRecord } from "@/lib/crm-roles-api";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  Globe,
  LayoutGrid,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  Shield,
  Users,
  XCircle,
} from "lucide-react";

type SettingsTab = "overview" | "site" | "payments" | "team" | "emails" | "security" | "appearance";

const TABS: { id: SettingsTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "site", label: "Site public", icon: Globe },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "team", label: "Équipe", icon: Users },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "appearance", label: "Apparence", icon: Palette },
];

export function CrmSettingsView() {
  const [health, setHealth] = useState<SettingsHealth | null>(null);
  const [portalAccounts, setPortalAccounts] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<SettingsTab>("overview");
  const [crmRoles, setCrmRoles] = useState<CrmRoleRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [healthData, accounts] = await Promise.all([
        fetchSettingsHealth(),
        fetchPortalAccounts(),
      ]);
      setHealth(healthData);
      setPortalAccounts(accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les paramètres.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const okCount = health?.integrations.filter((i) => i.status === "ok").length ?? 0;
  const issueCount =
    health?.integrations.filter((i) => i.status === "missing" || i.status === "degraded").length ?? 0;

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-3xl border border-[#071525]/10 bg-gradient-to-br from-[#071525] via-[#0a2844] to-[#071525] p-6 shadow-[0_20px_50px_-12px_rgba(7,21,37,0.45)] md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-300/80">
              Administration
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Paramètres CRM
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
              Intégrations, équipe, emails, sécurité et personnalisation — tout au même endroit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
        </div>

        {health && (
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="Session"
              value={health.adminConfigured ? "Active" : "Non configurée"}
              detail={`${health.director.name} · ${health.director.role}`}
            />
            <SummaryStat
              label="Intégrations"
              value={`${okCount} OK`}
              detail={issueCount > 0 ? `${issueCount} à vérifier` : "Tout est en ordre"}
              highlight={issueCount === 0}
            />
            <SummaryStat
              label="Espace client"
              value={`${health.portalAccounts} compte(s)`}
              detail="Tokens + clients CRM"
            />
          </div>
        )}
      </div>

      {/* Navigation onglets */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl border border-gray/40 bg-white p-1.5 shadow-sm"
        aria-label="Sections paramètres"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              tab === id
                ? "bg-[#071525] text-white shadow-md"
                : "text-gray-text hover:bg-gray-light/80 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading && !health ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray/40 bg-white py-24 text-sm text-gray-text shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : health ? (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <Section
                title="Intégrations & services"
                description="État des connexions externes et variables d'environnement."
                icon={<Database className="h-5 w-5 text-primary" aria-hidden />}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {health.integrations.map((item) => (
                    <IntegrationCard key={item.id} item={item} />
                  ))}
                </div>
              </Section>

              <Section
                title="Comptes espace client"
                description="Accès portail client (tokens + clients CRM liés)."
                icon={<Users className="h-5 w-5 text-violet-600" aria-hidden />}
              >
                {portalAccounts.length === 0 ? (
                  <EmptyState>Aucun compte portail configuré.</EmptyState>
                ) : (
                  <ul className="divide-y divide-gray/20 overflow-hidden rounded-xl border border-gray/30">
                    {portalAccounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-4 bg-white px-4 py-3.5 transition-colors hover:bg-gray-light/30"
                      >
                        <span className="font-medium text-foreground">{account.label}</span>
                        <code className="rounded-lg bg-gray-light/80 px-2.5 py-1 font-mono text-xs text-gray-text">
                          {account.id}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          )}

          {tab === "site" && (
            <Section
              title="Identité & contact — site public"
              description="Coordonnées, réseaux sociaux et mentions légales affichés sur le site vitrine."
              icon={<Globe className="h-5 w-5 text-emerald-600" aria-hidden />}
            >
              <SitePublicSection />
            </Section>
          )}

          {tab === "payments" && (
            <Section
              title="Coordonnées de paiement"
              description="Virement, Mobile Money et paiement en ligne CinetPay pour vos factures."
              icon={<CreditCard className="h-5 w-5 text-primary" aria-hidden />}
            >
              <PaymentSettingsSection />
            </Section>
          )}

          {tab === "team" && (
            <div className="space-y-6">
              <Section
                title="Rôles & permissions"
                description="Rôles système + rôles personnalisés pour votre équipe."
                icon={<Shield className="h-5 w-5 text-primary" aria-hidden />}
              >
                <CrmRolesSection onRolesChange={setCrmRoles} />
              </Section>

              <Section
                title="Utilisateurs"
                description="Assignez un rôle à chaque membre de l'équipe."
                icon={<Users className="h-5 w-5 text-violet-600" aria-hidden />}
              >
                <CrmUsersSection roles={crmRoles} />
              </Section>

              <Section
                title="Matrice des permissions"
                description="Aperçu des droits par rôle."
              >
                <PermissionsMatrix roles={crmRoles} />
              </Section>
            </div>
          )}

          {tab === "emails" && (
            <Section
              title="Modèles d'emails"
              description="Notifications transactionnelles Resend."
              icon={<Mail className="h-5 w-5 text-sky-600" aria-hidden />}
            >
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <StatusPill ok={health.emailConfigured}>
                  {health.emailConfigured ? "Resend actif" : "Mode console"}
                </StatusPill>
                {health.emailFrom && (
                  <span className="text-xs text-gray-text">
                    {health.emailFrom} → {health.emailTo}
                  </span>
                )}
              </div>
              <EmailTemplatesSection />
            </Section>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <Section
                title="Sécurité & sessions"
                description="Durée de session, webhooks et double authentification."
                icon={<Shield className="h-5 w-5 text-primary" aria-hidden />}
              >
                <CrmSecuritySection />
              </Section>

              <Section title="Journal d'audit" description="Dernières actions enregistrées.">
                <AuditLogSection />
              </Section>
            </div>
          )}

          {tab === "appearance" && (
            <div className="space-y-6">
              <Section
                title="Branding CRM"
                description="Nom, couleurs et identité visuelle du back-office."
                icon={<Palette className="h-5 w-5 text-violet-600" aria-hidden />}
              >
                <BrandingSection />
              </Section>

              <Section
                title="Calendrier externe (iCal)"
                description="Synchronisation en lecture seule avec Google, Outlook ou Apple."
                icon={<Calendar className="h-5 w-5 text-primary" aria-hidden />}
              >
                <code className="block overflow-x-auto rounded-xl border border-gray/30 bg-[#071525] p-4 font-mono text-xs text-sky-200">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/calendar/feed?token=VOTRE_ICAL_FEED_TOKEN`
                    : "/api/calendar/feed?token=ICAL_FEED_TOKEN"}
                </code>
                <p className="mt-3 text-xs leading-relaxed text-gray-text">
                  Remplacez le jeton par celui configuré sur le serveur, puis ajoutez cette URL dans
                  Google Calendar, Outlook ou Apple Calendrier.
                </p>
              </Section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className={cn("mt-0.5 text-xs", highlight ? "text-emerald-300/90" : "text-white/50")}>
        {detail}
      </p>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
      <div className="border-b border-gray/30 bg-gradient-to-r from-gray-light/40 to-white px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray/20">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-gray-text">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gray/40 bg-gray-light/20 px-4 py-8 text-center text-sm text-gray-text">
      {children}
    </p>
  );
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      {children}
    </span>
  );
}

function IntegrationCard({ item }: { item: IntegrationHealth }) {
  const statusDot =
    item.status === "ok"
      ? "bg-emerald-500"
      : item.status === "degraded"
        ? "bg-amber-500"
        : item.status === "configured"
          ? "bg-sky-500"
          : "bg-gray-400";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray/30 bg-gradient-to-br from-white to-gray-light/30 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot)} aria-hidden />
          <p className="font-semibold text-foreground">{item.name}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            INTEGRATION_STATUS_STYLES[item.status],
          )}
        >
          {INTEGRATION_STATUS_LABELS[item.status]}
        </span>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-gray-text">{item.detail}</p>
      {item.hint && (
        <p className="mt-2 text-xs leading-relaxed text-gray-text/75">{item.hint}</p>
      )}
    </div>
  );
}

const userFieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

function CrmUsersSection({ roles }: { roles: CrmRoleRecord[] }) {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await fetchCrmUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const data = new FormData(e.currentTarget);
    try {
      const { user, invitationSent } = await createCrmUserApi({
        name: String(data.get("name")),
        email: String(data.get("email")),
        role: String(data.get("role")),
      });
      setShowForm(false);
      await loadUsers();
      setSuccess(
        invitationSent
          ? `Invitation envoyée à ${user.email}.`
          : `Compte créé pour ${user.email}, mais l'email n'a pas pu être envoyé (vérifiez Resend).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  async function handleResendInvitation(user: CrmUser) {
    setError("");
    setSuccess("");
    setResendingId(user.id);
    try {
      const { invitationSent } = await resendUserInvitationApi(user.id);
      setSuccess(
        invitationSent
          ? `Invitation renvoyée à ${user.email}.`
          : `Impossible d'envoyer l'email à ${user.email} (vérifiez Resend).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        Invitez un collaborateur par email : il recevra un lien sécurisé pour définir son mot de
        passe (valable 72 h).
      </p>

      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : users.length === 0 ? (
        <EmptyState>Aucun utilisateur CRM pour le moment.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray/25 bg-gray-light/20 px-4 py-3.5 transition-colors hover:border-gray/40 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-gray-text">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={user.role}
                  onChange={(e) =>
                    void updateCrmUserApi(user.id, { role: e.target.value })
                      .then(loadUsers)
                      .catch((err) =>
                        setError(err instanceof Error ? err.message : "Mise à jour impossible."),
                      )
                  }
                  className="rounded-lg border border-gray/60 bg-white px-2.5 py-1.5 text-xs shadow-sm"
                  aria-label={`Rôle de ${user.name}`}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.slug}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    void updateCrmUserApi(user.id, { active: !user.active })
                      .then(loadUsers)
                      .catch((err) =>
                        setError(err instanceof Error ? err.message : "Mise à jour impossible."),
                      )
                  }
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    user.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-light text-gray-text",
                  )}
                >
                  {user.active ? "Actif" : "Inactif"}
                </button>
                {user.invitationPending && (
                  <>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      En attente
                    </span>
                    <button
                      type="button"
                      disabled={resendingId === user.id}
                      onClick={() => void handleResendInvitation(user)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                    >
                      {resendingId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <Mail className="h-3 w-3" aria-hidden />
                      )}
                      Renvoyer
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void deleteCrmUserApi(user.id).then(loadUsers)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/5"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-primary/20 bg-primary-light/20 p-5"
        >
          <p className="mb-1 text-sm font-semibold text-foreground">Nouvel utilisateur</p>
          <p className="mb-3 text-xs text-gray-text">
            Une invitation par email sera envoyée automatiquement.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Nom *" className={userFieldClass} />
            <input
              name="email"
              type="email"
              required
              placeholder="Email *"
              className={userFieldClass}
            />
            <select name="role" defaultValue="commercial" className={userFieldClass} aria-label="Rôle">
              {roles.map((role) => (
                <option key={role.id} value={role.slug}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              Créer le compte
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium text-gray-text hover:bg-white"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-light/30 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light/50"
        >
          <Users className="h-4 w-4" aria-hidden />
          Ajouter un utilisateur
        </button>
      )}
    </div>
  );
}
