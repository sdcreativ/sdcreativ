export type PaymentSettings = {
  /** Titulaire du compte bancaire */
  accountHolder: string;
  bankName: string;
  iban: string;
  bic: string;
  /** Mobile Money — numéros marchands */
  orangeMoneyNumber: string;
  waveNumber: string;
  mtnMomoNumber: string;
  /** Consigne affichée au client (référence facture, délai, etc.) */
  paymentNote: string;
  /** Paiement en ligne CinetPay activé (si clés API présentes) */
  onlineEnabled: boolean;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  accountHolder: "SD CREATIV",
  bankName: "",
  iban: "",
  bic: "",
  orangeMoneyNumber: "",
  waveNumber: "",
  mtnMomoNumber: "",
  paymentNote:
    "Merci d'indiquer la référence de votre facture (ex. FAC-2026-0001) comme motif de virement ou lors du paiement Mobile Money.",
  onlineEnabled: true,
};

export type PaymentInstructionsPayload = PaymentSettings & {
  referenceLabel: string;
  amountDue: number;
  formattedAmountDue: string;
  onlineAvailable: boolean;
};
