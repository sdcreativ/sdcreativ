export type SignatureEntityType = "quote" | "contract";

export type SignatureProvider = "native" | "yousign";

export type SignatureEventType =
  | "challenge.sent"
  | "otp.verified"
  | "otp.failed"
  | "signed"
  | "pdf.sealed"
  | "native.sent"
  | "native.link_opened";

export const SIGNATURE_OTP_EXPIRY_MINUTES = 10;
export const SIGNATURE_OTP_RESEND_COOLDOWN_SEC = 60;
export const NATIVE_SIGN_LINK_TTL_HOURS = 72;
