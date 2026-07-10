export type PdfVerification = {
  qrDataUrl: string;
  verifyUrl: string;
};

export function buildVerificationBlockHtml(verification: PdfVerification): string {
  const safeUrl = verification.verifyUrl
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `
  <div style="margin-top:2rem;padding:1rem;border:1px solid #e5e7eb;border-radius:12px;display:flex;gap:1rem;align-items:center;background:#f8fafc">
    <img src="${verification.qrDataUrl}" alt="QR vérification" width="88" height="88" style="flex-shrink:0" />
    <div style="font-size:0.75rem;color:#4b5563">
      <p style="margin:0 0 0.35rem;font-weight:700;color:#1e40af">Vérifier l&apos;authenticité</p>
      <p style="margin:0">Scannez ce QR code pour confirmer l&apos;intégrité du document.</p>
      <p style="margin:0.25rem 0 0;word-break:break-all;font-family:monospace;font-size:0.65rem">${safeUrl}</p>
    </div>
  </div>`;
}

export function injectVerificationBlock(html: string, verification?: PdfVerification): string {
  if (!verification) return html;
  const block = buildVerificationBlockHtml(verification);
  return html.replace("</body>", `${block}</body>`);
}
