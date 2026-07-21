"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { fetchCrmSession } from "@/lib/crm-settings-api";

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

const ACTIVITY_THROTTLE_MS = 1_000;
const DEFAULT_WARNING_SECONDS = 60;

function warningSecondsForIdle(idleMinutes: number): number {
  const idleSec = idleMinutes * 60;
  return Math.min(120, Math.max(30, Math.round(idleSec * 0.1)));
}

async function logoutAndRedirect() {
  try {
    await fetch("/api/admin/login", { method: "DELETE", credentials: "include" });
  } catch {
    /* ignore */
  }
  const from = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`,
  );
  window.location.href = `/admin/login?from=${from}`;
}

async function touchSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/settings/session", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function CrmIdleTimeoutWatcher() {
  const [idleMinutes, setIdleMinutes] = useState<number | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WARNING_SECONDS);
  const [staying, setStaying] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(0);
  const warningOpenRef = useRef(false);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    idleTimerRef.current = null;
    warnTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
    setWarningOpen(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (!loggingOutRef.current) {
            loggingOutRef.current = true;
            void logoutAndRedirect();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, []);

  const armTimers = useCallback(() => {
    if (idleMinutes == null || idleMinutes <= 0) return;
    clearTimers();
    const idleMs = idleMinutes * 60 * 1000;
    const warnSec = warningSecondsForIdle(idleMinutes);
    const warnMs = warnSec * 1000;
    const untilWarn = Math.max(0, idleMs - warnMs);

    warnTimerRef.current = setTimeout(() => {
      startCountdown(warnSec);
    }, untilWarn);

    idleTimerRef.current = setTimeout(() => {
      if (!loggingOutRef.current) {
        loggingOutRef.current = true;
        void logoutAndRedirect();
      }
    }, idleMs);
  }, [idleMinutes, clearTimers, startCountdown]);

  const onActivity = useCallback(() => {
    if (warningOpenRef.current) return;
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;
    armTimers();
  }, [armTimers]);

  useEffect(() => {
    void fetchCrmSession()
      .then((session) => {
        setIdleMinutes(
          typeof session.idleTimeoutMinutes === "number"
            ? session.idleTimeoutMinutes
            : 30,
        );
      })
      .catch(() => setIdleMinutes(30));
  }, []);

  useEffect(() => {
    if (idleMinutes == null || idleMinutes <= 0) {
      clearTimers();
      setWarningOpen(false);
      return;
    }
    armTimers();
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity);
      }
    };
  }, [idleMinutes, armTimers, onActivity, clearTimers]);

  async function handleStayConnected() {
    setStaying(true);
    const ok = await touchSession();
    setStaying(false);
    if (!ok) {
      loggingOutRef.current = true;
      await logoutAndRedirect();
      return;
    }
    setWarningOpen(false);
    armTimers();
  }

  if (!warningOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-desc"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <ShieldAlert className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <div>
            <h2 id="idle-timeout-title" className="text-lg font-bold text-foreground">
              Session bientôt expirée
            </h2>
            <p id="idle-timeout-desc" className="mt-2 text-sm leading-relaxed text-gray-text">
              Inactivité détectée. Vous serez déconnecté dans{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {secondsLeft}s
              </span>
              .
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={staying || loggingOutRef.current}
            onClick={() => {
              loggingOutRef.current = true;
              void logoutAndRedirect();
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-text hover:bg-gray-light"
          >
            Se déconnecter
          </button>
          <button
            type="button"
            disabled={staying || loggingOutRef.current}
            onClick={() => void handleStayConnected()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {staying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  );
}
