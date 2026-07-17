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
import { CrmOperationsSettingsSection } from "@/components/admin/CrmOperationsSettingsSection";
import { CrmApiKeysSection } from "@/components/admin/CrmApiKeysSection";
import { CrmLegalEntitiesSection } from "@/components/admin/CrmLegalEntitiesSection";
import type { CrmUser } from "@/lib/crm-users";
import {
  allocateUniqueTeamEmailLocalPart,
  buildTeamEmail,
  getCrmTeamEmailDomain,
  isCrmTeamEmail,
  isTeamEmailTaken,
  normalizeTeamEmailLocalPart,
  suggestTeamEmailLocalPartFromName,
  teamEmailValidationMessage,
} from "@/lib/crm-team-email";
import { fetchPortalAccounts, fetchSettingsHealth } from "@/lib/settings-api";
import type { CrmRoleRecord } from "@/lib/crm-roles-api";
import { fetchCrmRoles } from "@/lib/crm-roles-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  Globe,
  LayoutGrid,
  Grid3X3,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";

type SettingsTab = "overview" | "site" | "payments" | "team" | "emails" | "security" | "appearance" | "operations";
type TeamSubTab = "roles" | "users" | "matrix";

const TABS: { id: SettingsTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "site", label: "Site public", icon: Globe },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "team", label: "Équipe", icon: Users },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "operations", label: "Opérations", icon: BarChart3 },
  { id: "appearance", label: "Apparence", icon: Palette },
];

export function CrmSettingsView() {
  const [health, setHealth] = useState<SettingsHealth | null>(null);
  const [portalAccounts, setPortalAccounts] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<SettingsTab>("overview");
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>("roles");
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

  useEffect(() => {
    if (tab !== "team") return;
    void fetchCrmRoles()
      .then(setCrmRoles)
      .catch(() => setCrmRoles([]));
  }, [tab]);

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
            <div className="space-y-5">
              <nav
                className="flex gap-1 overflow-x-auto rounded-2xl border border-gray/30 bg-gray-light/30 p-1.5"
                aria-label="Sous-sections équipe"
              >
                {(
                  [
                    { id: "roles" as const, label: "Rôles", icon: Shield },
                    { id: "users" as const, label: "Utilisateurs", icon: Users },
                    { id: "matrix" as const, label: "Matrice", icon: Grid3X3 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTeamSubTab(id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                      teamSubTab === id
                        ? "bg-white text-foreground shadow-sm ring-1 ring-gray/20"
                        : "text-gray-text hover:bg-white/70 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </nav>

              {teamSubTab === "roles" && (
                <Section
                  title="Rôles & permissions"
                  description="Rôles système et profils personnalisés pour contrôler l'accès au CRM."
                  icon={<Shield className="h-5 w-5 text-primary" aria-hidden />}
                >
                  <CrmRolesSection onRolesChange={setCrmRoles} />
                </Section>
              )}

              {teamSubTab === "users" && (
                <Section
                  title="Utilisateurs"
                  description="Invitez et gérez les membres de votre équipe CRM."
                  icon={<Users className="h-5 w-5 text-violet-600" aria-hidden />}
                >
                  <CrmUsersSection roles={crmRoles} />
                </Section>
              )}

              {teamSubTab === "matrix" && (
                <Section
                  title="Matrice des permissions"
                  description="Vue d'ensemble des droits accordés à chaque rôle."
                  icon={<Grid3X3 className="h-5 w-5 text-emerald-600" aria-hidden />}
                >
                  <PermissionsMatrix roles={crmRoles} />
                </Section>
              )}
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

          {tab === "operations" && (
            <div className="space-y-6">
              <Section
                title="Rapports planifiés"
                description="Destinataires, fréquence et KPIs envoyés automatiquement par email."
                icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}
              >
                <CrmOperationsSettingsSection />
              </Section>
              <Section
                title="Clés API publiques"
                description="Intégrations Zapier, Make et outils comptables externes."
                icon={<Shield className="h-5 w-5 text-primary" aria-hidden />}
              >
                <CrmApiKeysSection />
              </Section>
              <Section
                title="Multi-entités"
                description="Structures juridiques et devises par défaut pour la facturation."
                icon={<Globe className="h-5 w-5 text-primary" aria-hidden />}
              >
                <CrmLegalEntitiesSection />
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
  const { confirm } = useDialog();
  const teamDomain = getCrmTeamEmailDomain();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [invitePersonalEmail, setInvitePersonalEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSmsOtp, setInviteSmsOtp] = useState(false);
  const [inviteLocalPart, setInviteLocalPart] = useState("");
  const [inviteNameBase, setInviteNameBase] = useState("");
  const [emailLocalPartManual, setEmailLocalPartManual] = useState(false);
  const [creating, setCreating] = useState(false);

  const inviteEmail = inviteLocalPart
    ? buildTeamEmail(inviteLocalPart, teamDomain)
    : "";
  const existingEmails = users.map((user) => user.email);
  const inviteEmailTaken =
    Boolean(inviteEmail) && isTeamEmailTaken(inviteEmail, existingEmails);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await fetchCrmUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function resetInviteFormState() {
    setInviteName("");
    setInvitePersonalEmail("");
    setInvitePhone("");
    setInviteSmsOtp(false);
    setInviteLocalPart("");
    setInviteNameBase("");
    setEmailLocalPartManual(false);
    setError("");
  }

  function assignGeneratedLocalPart(localPart: string) {
    setInviteLocalPart(localPart);
  }

  function openInviteForm() {
    resetInviteFormState();
    setShowForm(true);
  }

  function closeInviteForm() {
    setShowForm(false);
    resetInviteFormState();
  }

  function generateUniqueLocalPart(fullName: string): string {
    const base = suggestTeamEmailLocalPartFromName(fullName);
    if (!base) return "";
    try {
      return allocateUniqueTeamEmailLocalPart(base, existingEmails, teamDomain);
    } catch {
      return "";
    }
  }

  function handleInviteNameChange(value: string) {
    setInviteName(value);
    if (emailLocalPartManual) return;

    const base = suggestTeamEmailLocalPartFromName(value);
    if (!base) {
      setInviteLocalPart("");
      setInviteNameBase("");
      return;
    }
    if (base === inviteNameBase && inviteLocalPart) return;

    setInviteNameBase(base);
    assignGeneratedLocalPart(generateUniqueLocalPart(value));
  }

  function handleInviteLocalPartChange(value: string) {
    setEmailLocalPartManual(true);
    setInviteLocalPart(normalizeTeamEmailLocalPart(value));
  }

  function regenerateInviteEmail() {
    setEmailLocalPartManual(false);
    const base = suggestTeamEmailLocalPartFromName(inviteName);
    setInviteNameBase(base);
    assignGeneratedLocalPart(generateUniqueLocalPart(inviteName));
    setError("");
  }

  const activeCount = users.filter((u) => u.active).length;
  const pendingCount = users.filter((u) => u.invitationPending).length;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const data = new FormData(e.currentTarget);
    const name = inviteName.trim();
    const personalEmail = invitePersonalEmail.trim().toLowerCase();
    const email = buildTeamEmail(inviteLocalPart, teamDomain);

    if (name.length < 2) {
      setError("Indiquez le nom complet (au moins 2 caractères).");
      return;
    }
    if (!personalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
      setError("Indiquez l'email personnel de l'invité.");
      return;
    }
    if (isCrmTeamEmail(personalEmail, teamDomain)) {
      setError("L'email personnel ne doit pas être une adresse @sdcreativ.com.");
      return;
    }
    if (personalEmail === email.toLowerCase()) {
      setError("L'email personnel doit être différent de l'email professionnel.");
      return;
    }
    const phone = invitePhone.trim();
    if (!phone) {
      setError("Indiquez le numéro de téléphone de l'invité.");
      return;
    }
    if (!isCrmTeamEmail(email, teamDomain)) {
      setError(teamEmailValidationMessage(teamDomain));
      return;
    }
    if (isTeamEmailTaken(email, existingEmails)) {
      setError("Cet email est déjà utilisé. Régénérez une adresse ou choisissez-en une autre.");
      return;
    }

    setCreating(true);
    try {
      const { user, invitationSent } = await createCrmUserApi({
        name,
        email,
        personalEmail,
        phone,
        smsOtpEnabled: inviteSmsOtp,
        role: String(data.get("role")),
      });

      closeInviteForm();
      await loadUsers();
      setSuccess(
        invitationSent
          ? `Invitation envoyée à ${personalEmail} (identifiant CRM : ${user.email}).`
          : `Compte créé pour ${user.email}, mais l'email n'a pas pu être envoyé (vérifiez Resend).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreating(false);
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
          ? `Invitation renvoyée à l'email personnel de ${user.name}${user.personalEmail ? ` (${user.personalEmail})` : ""}.`
          : `Impossible d'envoyer l'email (vérifiez Resend).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setResendingId(null);
    }
  }

  function getRoleLabel(slug: string) {
    return roles.find((r) => r.slug === slug)?.label ?? slug;
  }

  async function handleDeleteUser(user: CrmUser) {
    setError("");
    setSuccess("");
    const ok = await confirm({
      title: "Supprimer le membre",
      message: `Supprimer définitivement ${user.name} (${user.email}) ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCrmUserApi(user.id);
      await loadUsers();
      setSuccess(`Utilisateur supprimé : ${user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-gray-light/30 px-4 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Équipe</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{users.length}</p>
          <p className="mt-0.5 text-xs text-gray-text">utilisateur(s) au total</p>
        </div>
        <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-emerald-50/50 px-4 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Actifs</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{activeCount}</p>
          <p className="mt-0.5 text-xs text-gray-text">comptes opérationnels</p>
        </div>
        <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-amber-50/50 px-4 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Invitations</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="mt-0.5 text-xs text-gray-text">en attente d&apos;activation</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 px-4 py-3.5 text-sm text-sky-950">
        <p className="font-semibold text-sky-950">Invitation équipe</p>
        <p className="mt-1 leading-relaxed text-sky-900/90">
          L&apos;invitation part sur l&apos;email personnel. L&apos;identifiant{" "}
          <span className="font-medium">@{teamDomain}</span> sert de login CRM (sans boîte Hostinger
          individuelle pour l&apos;instant). Ajoutez le téléphone pour permettre le code 2FA par SMS.
        </p>
      </div>

      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray/30 bg-gray-light/20 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des utilisateurs…
        </div>
      ) : users.length === 0 ? (
        <EmptyState>Aucun utilisateur CRM pour le moment.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {users.map((user) => (
            <article
              key={user.id}
              className="group overflow-hidden rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-gray-light/25 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ring-1",
                      user.active
                        ? "bg-primary/10 text-primary ring-primary/20"
                        : "bg-gray-light text-gray-text ring-gray/20",
                    )}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-gray-text">{user.email}</p>
                    {user.personalEmail ? (
                      <p className="truncate text-[11px] text-gray-text/80">
                        Perso : {user.personalEmail}
                      </p>
                    ) : (
                      <p className="truncate text-[11px] text-amber-700">
                        Email personnel manquant (2FA)
                      </p>
                    )}
                    {user.phone ? (
                      <p className="truncate text-[11px] text-gray-text/80">
                        Tél. : {user.phone}
                        {user.smsOtpEnabled ? " · SMS 2FA" : ""}
                      </p>
                    ) : null}
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-text ring-1 ring-gray/15">
                      <Shield className="h-3 w-3 text-primary" aria-hidden />
                      {getRoleLabel(user.role)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-text">
                    Email personnel (2FA)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      defaultValue={user.personalEmail ?? ""}
                      placeholder="perso@gmail.com"
                      id={`personal-email-${user.id}`}
                      className="min-w-0 flex-1 rounded-xl border border-gray/50 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          `personal-email-${user.id}`,
                        ) as HTMLInputElement | null;
                        const value = input?.value.trim() ?? "";
                        void updateCrmUserApi(user.id, {
                          personalEmail: value || null,
                        })
                          .then(loadUsers)
                          .catch((err) =>
                            setError(
                              err instanceof Error ? err.message : "Mise à jour impossible.",
                            ),
                          );
                      }}
                      className="shrink-0 rounded-xl border border-gray/40 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
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
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                      user.active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80"
                        : "bg-gray-light text-gray-text hover:bg-gray/30",
                    )}
                  >
                    {user.active ? "Actif" : "Inactif"}
                  </button>
                  {user.invitationPending && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      En attente
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 border-t border-gray/15 pt-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-text">
                    Rôle assigné
                  </label>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      void updateCrmUserApi(user.id, { role: e.target.value })
                        .then(loadUsers)
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : "Mise à jour impossible."),
                        )
                    }
                    className="w-full rounded-xl border border-gray/50 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    aria-label={`Rôle de ${user.name}`}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.slug}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.invitationPending && (
                    <button
                      type="button"
                      disabled={resendingId === user.id}
                      onClick={() => void handleResendInvitation(user)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary-light/20 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-light/40 disabled:opacity-50"
                    >
                      {resendingId === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Renvoyer l&apos;invitation
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteUser(user)}
                    className="rounded-xl border border-accent/20 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/5"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={openInviteForm}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300/50 bg-gradient-to-br from-violet-50/50 to-white px-5 py-4 text-sm font-semibold text-violet-700 transition-all hover:border-violet-400/60 hover:shadow-md sm:w-auto"
      >
        <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" aria-hidden />
        Inviter un utilisateur
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray/20 bg-gradient-to-r from-violet-50/60 to-white px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-text">
                  Invitation
                </p>
                <h2 className="mt-1 text-lg font-bold text-foreground">Nouvel utilisateur</h2>
                <p className="mt-1 text-sm text-gray-text">
                  Les accès seront envoyés à l&apos;email personnel de l&apos;invité.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteForm}
                className="rounded-xl border border-gray/30 p-2 text-gray-text hover:bg-gray-light/60"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Nom complet *
                </label>
                <input
                  value={inviteName}
                  onChange={(e) => handleInviteNameChange(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Prénom Nom"
                  className={userFieldClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Email personnel de l&apos;invité *
                </label>
                <input
                  type="email"
                  value={invitePersonalEmail}
                  onChange={(e) => setInvitePersonalEmail(e.target.value.trim())}
                  required
                  autoComplete="email"
                  placeholder="collaborateur@gmail.com"
                  className={userFieldClass}
                />
                <p className="mt-1.5 text-xs text-gray-text">
                  C&apos;est à cette adresse que seront envoyés le lien d&apos;activation et les codes 2FA.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="+225 07 00 00 00 00"
                  className={userFieldClass}
                />
                <p className="mt-1.5 text-xs text-gray-text">
                  Obligatoire pour le CRM. Utilisé pour le code SMS si activé.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray/25 bg-white px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={inviteSmsOtp}
                  onChange={(e) => setInviteSmsOtp(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-gray-text">
                  Activer la réception du code 2FA aussi par <span className="font-medium text-foreground">SMS</span>{" "}
                  (en plus de l&apos;email personnel).
                </span>
              </label>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Identifiant CRM (email pro) *
                </label>
                <div className="flex overflow-hidden rounded-xl border border-gray/60 bg-white shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    value={inviteLocalPart}
                    onChange={(e) => handleInviteLocalPartChange(e.target.value)}
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="prenom.nom"
                    aria-label="Partie locale de l’email"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-0"
                  />
                  <span className="flex shrink-0 items-center border-l border-gray/40 bg-gray-light/40 px-3 text-sm font-medium text-gray-text">
                    @{teamDomain}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <p
                    className={cn(
                      "text-gray-text",
                      inviteEmailTaken && "font-medium text-amber-700",
                    )}
                  >
                    {inviteEmail ? (
                      <>
                        Identifiant :{" "}
                        <span className="font-medium text-foreground">{inviteEmail}</span>
                        {inviteEmailTaken
                          ? " — déjà utilisé dans le CRM"
                          : emailLocalPartManual
                            ? " (modifié manuellement)"
                            : " — unique dans le CRM"}
                      </>
                    ) : (
                      <>Généré automatiquement dès que le nom est renseigné.</>
                    )}
                  </p>
                  {inviteName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={regenerateInviteEmail}
                      className="font-semibold text-primary hover:underline"
                    >
                      Régénérer
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-text">
                  Sert uniquement de login CRM pour l&apos;instant (pas de boîte Hostinger individuelle).
                </p>
              </div>

              <select name="role" defaultValue="commercial" className={userFieldClass} aria-label="Rôle">
                {roles.map((role) => (
                  <option key={role.id} value={role.slug}>
                    {role.label}
                  </option>
                ))}
              </select>

              <p className="rounded-xl border border-gray/20 bg-gray-light/30 px-3.5 py-3 text-sm text-gray-text">
                L&apos;invité reçoit un lien sur son email personnel, définit son mot de passe CRM à
                la première connexion, puis se connecte avec{" "}
                <span className="font-medium text-foreground">
                  {inviteEmail || `prenom.nom@${teamDomain}`}
                </span>
                .
              </p>

              {error && (
                <p className="rounded-xl border border-accent/30 bg-accent/5 px-3.5 py-2.5 text-sm text-accent">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray/20 bg-gray-light/20 px-6 py-4">
              <button
                type="button"
                onClick={closeInviteForm}
                className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium text-gray-text hover:bg-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={
                  creating ||
                  !inviteLocalPart ||
                  !invitePersonalEmail ||
                  !invitePhone.trim() ||
                  inviteEmailTaken
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden />
                )}
                Envoyer l&apos;invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
