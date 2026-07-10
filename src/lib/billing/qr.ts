import QRCode from "qrcode";
import { buildPublicVerifyUrl } from "@/lib/billing/verify-token";

export async function buildQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 120,
    margin: 1,
    color: { dark: "#1e40af", light: "#ffffff" },
  });
}

export async function buildDocumentVerificationAssets(
  type: "devis" | "facture",
  reference: string,
): Promise<{ verifyUrl: string; qrDataUrl: string }> {
  const verifyUrl = buildPublicVerifyUrl(type, reference);
  const qrDataUrl = await buildQrDataUrl(verifyUrl);
  return { verifyUrl, qrDataUrl };
}
