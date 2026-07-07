"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  ChevronRight,
  FileText,
  FolderKanban,
  HelpCircle,
  LifeBuoy,
  Receipt,
  Shield,
  Sparkles,
} from "lucide-react";
import { ClientPortalLogin } from "@/components/espace-client/ClientPortalLogin";
import { WaitlistForm } from "@/components/forms/WaitlistForm";
import { useSitePublic } from "@/components/site/SitePublicProvider";
import type { ClientProfileData } from "@/lib/client-portal-config";

type Props = {
  onSuccess: (session: { clientId: string; profile: ClientProfileData }) => void;
};

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Suivi projet",
    description: "Avancement, jalons et dates clés en direct.",
  },
  {
    icon: FileText,
    title: "Documents",
    description: "Contrats, livrables et dépôts sécurisés.",
  },
  {
    icon: Receipt,
    title: "Factures",
    description: "Consultez et téléchargez vos justificatifs.",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    description: "Ouvrez un ticket et suivez les réponses.",
  },
] as const;

export function ClientPortalGuest({ onSuccess }: Props) {
  const { contact } = useSitePublic();
  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">
      {/* Panneau gauche — desktop */}
      <div className="relative hidden w-[44%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a3d6b] via-[#0c4a80] to-[#071525]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <div>
            <Logo href="/" variant="mark" size="panel" priority className="inline-block" />
            <h1 className="mt-10 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Votre image,
              <br />
              votre site,
              <br />
              <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">
                votre impact.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/75">
              Suivez votre projet, accédez à vos documents et échangez avec notre équipe — sans
              passer par email.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <Icon className="h-5 w-5 text-sky-300" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{description}</p>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex items-center gap-2 text-xs text-white/50">
            <Shield className="h-4 w-4 shrink-0 text-sky-300/80" aria-hidden />
            Données hébergées en Europe · stockage chiffré
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex flex-1 flex-col">
        {/* Bandeau mobile */}
        <div className="border-b border-gray/30 bg-gradient-to-r from-[#0a3d6b] to-[#0c4a80] px-6 py-8 text-white lg:hidden">
          <Logo href="/" variant="mark" size="panelMobile" className="inline-block" />
          <p className="mt-4 text-lg font-bold leading-snug">
            Espace client
            <span className="font-normal text-white/70"> — suivez votre projet en direct</span>
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Espace client
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Connexion</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-text">
              Utilisez l&apos;identifiant et le code d&apos;accès que nous vous avons transmis par
              email.
            </p>

            <div className="mt-8 rounded-2xl border border-gray/50 bg-white p-6 shadow-sm ring-1 ring-black/[0.02] md:p-8">
              <ClientPortalLogin onSuccess={onSuccess} />
            </div>

            <details className="group mt-6 rounded-2xl border border-gray/50 bg-white px-5 py-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
                Où trouver mes identifiants ?
                <ChevronRight
                  className="ml-auto h-4 w-4 text-gray-text transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <ol className="mt-4 space-y-2 border-t border-gray/30 pt-4 text-sm text-gray-text">
                <li>
                  <span className="font-medium text-foreground">1.</span> Vérifiez l&apos;email
                  de bienvenue SD CREATIV (objet « Votre espace client »).
                </li>
                <li>
                  <span className="font-medium text-foreground">2.</span> L&apos;identifiant ressemble
                  à <code className="rounded bg-gray-light px-1.5 py-0.5 text-xs">votre-entreprise</code>.
                </li>
                <li>
                  <span className="font-medium text-foreground">3.</span> Le code est personnel — ne
                  le partagez pas.
                </li>
                <li>
                  <span className="font-medium text-foreground">4.</span> Besoin d&apos;aide ?{" "}
                  <a href={contact.email ? `mailto:${contact.email}` : "/contact"} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </li>
              </ol>
            </details>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-text">
              <span>Pas encore client ?</span>
              <Link href="/contact" className="font-semibold text-primary hover:underline">
                Contactez-nous
              </Link>
              <span className="text-gray/60">·</span>
              <Link href="/devis" className="font-semibold text-primary hover:underline">
                Demander un devis
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light/30 to-white">
              <div className="flex items-center gap-2 border-b border-primary/10 px-5 py-3">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold text-foreground">Rejoindre la beta</span>
              </div>
              <div className="p-5">
                <p className="mb-4 text-xs text-gray-text">
                  Soyez parmi les premiers à tester les nouvelles fonctionnalités de l&apos;espace
                  client.
                </p>
                <WaitlistForm defaultInterest="espace-client" />
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-gray-text">
              Équipe SD CREATIV ?{" "}
              <Link href="/admin/login" className="font-medium text-primary hover:underline">
                Accès CRM
              </Link>
              {" · "}
              <Link href="/" className="hover:text-foreground hover:underline">
                Retour au site
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
