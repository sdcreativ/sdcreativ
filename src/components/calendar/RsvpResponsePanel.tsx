"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarCheck, Check, HelpCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type RsvpChoice = "accepted" | "declined" | "tentative";

type RsvpPayload = {
  event: {
    title: string;
    when: string;
    meetingUrl: string | null;
  };
  participant: {
    name: string | null;
    email: string;
    status: string;
    statusLabel: string;
  };
};

const CHOICES: Array<{
  status: RsvpChoice;
  label: string;
  className: string;
  icon: typeof Check;
}> = [
  {
    status: "accepted",
    label: "Accepter",
    className: "bg-emerald-600 hover:bg-emerald-700 text-white",
    icon: Check,
  },
  {
    status: "tentative",
    label: "Peut-être",
    className: "bg-amber-600 hover:bg-amber-700 text-white",
    icon: HelpCircle,
  },
  {
    status: "declined",
    label: "Refuser",
    className: "bg-red-600 hover:bg-red-700 text-white",
    icon: X,
  },
];

export function RsvpResponsePanel({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus?: RsvpChoice | null;
}) {
  const [data, setData] = useState<RsvpPayload | null>(null);
  const [error, setError] = useState("");
  const [doneLabel, setDoneLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const autoSubmitted = useRef(false);

  async function submit(status: RsvpChoice) {
    setError("");
    try {
      const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as {
        error?: string;
        participant?: { statusLabel: string; status: string };
      };
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible.");
      setDoneLabel(json.participant?.statusLabel ?? "Réponse enregistrée");
      setData((prev) =>
        prev && json.participant
          ? {
              ...prev,
              participant: {
                ...prev.participant,
                status: json.participant.status,
                statusLabel: json.participant.statusLabel,
              },
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`);
        const json = (await res.json()) as RsvpPayload & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Lien invalide.");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lien invalide.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!initialStatus || !data || doneLabel || autoSubmitted.current) return;
    autoSubmitted.current = true;
    startTransition(() => {
      void submit(initialStatus);
    });
  }, [initialStatus, data, doneLabel]);

  if (error && !data) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarCheck className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          SD CREATIV
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground">{data.event.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{data.event.when}</p>
        {data.participant.name ? (
          <p className="mt-1 text-xs text-gray-500">Pour {data.participant.name}</p>
        ) : null}
      </div>

      {doneLabel ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          Merci — réponse enregistrée : {doneLabel}.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            return (
              <button
                key={choice.status}
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => void submit(choice.status))}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
                  choice.className,
                )}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden />
                )}
                {choice.label}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : null}

      {data.event.meetingUrl ? (
        <p className="text-center text-sm">
          <a
            href={data.event.meetingUrl}
            className="font-semibold text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Lien de réunion
          </a>
        </p>
      ) : null}
    </div>
  );
}
