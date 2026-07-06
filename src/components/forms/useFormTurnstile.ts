"use client";

import { useCallback, useState } from "react";
import { isTurnstileEnabled } from "@/components/forms/TurnstileWidget";

export function useFormTurnstile() {
  const [turnstileToken, setTurnstileToken] = useState("");
  const required = isTurnstileEnabled();

  const validate = useCallback((): string | null => {
    if (required && !turnstileToken) {
      return "Veuillez valider le captcha anti-spam.";
    }
    return null;
  }, [required, turnstileToken]);

  const reset = useCallback(() => setTurnstileToken(""), []);

  return {
    required,
    turnstileToken,
    setTurnstileToken,
    validate,
    reset,
  };
}
