"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

type AlertOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
};

type PromptOptions = {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return ctx;
}

type ActiveDialog =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | {
      kind: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
      value: string;
    };

const fieldClass =
  "mt-2 w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: "confirm",
        options: typeof options === "string" ? { message: options } : options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: "alert",
        options: typeof options === "string" ? { message: options } : options,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setDialog({
        kind: "prompt",
        options,
        resolve,
        value: options.defaultValue ?? "",
      });
    });
  }, []);

  useEffect(() => {
    if (dialog?.kind !== "prompt") return;
    promptInputRef.current?.focus();
    promptInputRef.current?.select();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDialog((current) => {
        if (!current) return null;
        if (current.kind === "confirm") current.resolve(false);
        else if (current.kind === "alert") current.resolve();
        else current.resolve(null);
        return null;
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  function dismiss(result: boolean | string | null) {
    if (!dialog) return;

    if (dialog.kind === "confirm") {
      dialog.resolve(result === true);
    } else if (dialog.kind === "alert") {
      dialog.resolve();
    } else {
      dialog.resolve(typeof result === "string" ? result : null);
    }

    setDialog(null);
  }

  const title =
    dialog?.kind === "confirm"
      ? dialog.options.title ?? "Confirmer l'action"
      : dialog?.kind === "alert"
        ? dialog.options.title ?? "Information"
        : dialog?.kind === "prompt"
          ? dialog.options.title ?? "Saisie"
          : "";

  const isDanger =
    dialog?.kind === "confirm" && dialog.options.variant === "danger";

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => dismiss(dialog.kind === "prompt" ? null : false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {dialog.kind === "confirm" && isDanger && (
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
                  </div>
                )}
                <div>
                  <h2 id="app-dialog-title" className="text-lg font-bold text-foreground">
                    {title}
                  </h2>
                  {dialog.kind === "confirm" && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-text">
                      {dialog.options.message}
                    </p>
                  )}
                  {dialog.kind === "alert" && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-text">
                      {dialog.options.message}
                    </p>
                  )}
                  {dialog.kind === "prompt" && dialog.options.message && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-text">
                      {dialog.options.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(dialog.kind === "prompt" ? null : false)}
                className="rounded-lg p-1 text-gray-text transition-colors hover:bg-gray-light hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {dialog.kind === "prompt" && (
              <label className="mb-5 block text-sm font-medium text-foreground">
                {dialog.options.placeholder ?? "Valeur"}
                <input
                  ref={promptInputRef}
                  type="text"
                  value={dialog.value}
                  onChange={(event) =>
                    setDialog((current) =>
                      current?.kind === "prompt"
                        ? { ...current, value: event.target.value }
                        : current,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      dismiss(dialog.value);
                    }
                  }}
                  className={fieldClass}
                />
              </label>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {dialog.kind !== "alert" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-center text-foreground"
                  onClick={() => dismiss(dialog.kind === "prompt" ? null : false)}
                >
                  {dialog.kind === "confirm"
                    ? dialog.options.cancelLabel ?? "Annuler"
                    : dialog.options.cancelLabel ?? "Annuler"}
                </Button>
              )}

              {dialog.kind === "confirm" && (
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "justify-center",
                    isDanger && "bg-accent hover:bg-accent-dark",
                  )}
                  onClick={() => dismiss(true)}
                >
                  {dialog.options.confirmLabel ?? "Confirmer"}
                </Button>
              )}

              {dialog.kind === "alert" && (
                <Button type="button" size="sm" className="justify-center" onClick={() => dismiss(true)}>
                  {dialog.options.confirmLabel ?? "OK"}
                </Button>
              )}

              {dialog.kind === "prompt" && (
                <Button
                  type="button"
                  size="sm"
                  className="justify-center"
                  onClick={() => dismiss(dialog.value)}
                >
                  {dialog.options.confirmLabel ?? "Valider"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
