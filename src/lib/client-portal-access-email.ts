import { escapeHtml, htmlRow } from "@/lib/email";

export function buildPortalAccessEmailHtml(input: {
  clientName: string;
  portalClientId: string;
  accessCode: string;
  siteUrl: string;
  isRotation?: boolean;
}): string {
  const portalUrl = `${input.siteUrl}/espace-client`;
  const intro = input.isRotation
    ? `<p>Bonjour ${escapeHtml(input.clientName.split(" ")[0] ?? input.clientName)},</p>
       <p>Suite à votre demande, voici vos <strong>nouveaux identifiants</strong> d'accès à l'espace client SD CREATIV.</p>
       <p style="color:#b45309;font-size:14px">L'ancien code d'accès n'est plus valide.</p>`
    : `<p>Bonjour ${escapeHtml(input.clientName.split(" ")[0] ?? input.clientName)},</p>
       <p>Bienvenue dans votre <strong>espace client SD CREATIV</strong>. Vous y retrouverez votre projet, vos documents, devis et factures.</p>`;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    ${intro}
    <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Vos identifiants personnels</p>
      ${htmlRow("Identifiant client", input.portalClientId)}
      ${htmlRow("Code d'accès", input.accessCode)}
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280">
        Ces identifiants sont <strong>strictement personnels</strong> — ne les partagez avec personne.
      </p>
    </div>
    <p style="text-align:center;margin:28px 0">
      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#1e40af;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">
        Accéder à mon espace client
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280">
      Code perdu ou oublié ? Contactez-nous à
      <a href="mailto:contact@sdcreativ.com">contact@sdcreativ.com</a>
      en indiquant votre entreprise et votre email professionnel.
    </p>
  </div>`;
}
