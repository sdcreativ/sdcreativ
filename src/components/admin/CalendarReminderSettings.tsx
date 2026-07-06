"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUTO_ITEM_TYPES,
  CALENDAR_ITEM_COLORS,
  CALENDAR_ITEM_LABELS,
  type CalendarItemType,
} from "@/content/calendar-labels";
import type { CalendarReminderPreferences } from "@/lib/calendar-user-preferences";
import {
  fetchCalendarReminderPreferences,
  updateCalendarReminderPreferencesApi,
} from "@/lib/calendar-api";
import { cn } from "@/lib/utils";
import { BellRing, Loader2, MessageSquare, Smartphone } from "lucide-react";

const fieldClass =
  "rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CalendarReminderSettings() {
  const [prefs, setPrefs] = useState<CalendarReminderPreferences | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchCalendarReminderPreferences();
      setPrefs(json.preferences);
      setTwilioConfigured(json.twilioConfigured);
    } catch {
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: Partial<CalendarReminderPreferences>) {
    if (!prefs) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateCalendarReminderPreferencesApi(next);
      setPrefs(updated);
      setMessage("Préférences enregistrées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-white px-5 py-4 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement des préférences…
      </div>
    );
  }

  if (!prefs) return null;

  const editableTypes = [...AUTO_ITEM_TYPES, "meeting", "call", "reminder", "other"] as CalendarItemType[];

  return (
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary-light/20 to-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BellRing className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Rappels configurables</p>
          <p className="mt-0.5 text-sm text-gray-text">
            Personnalisez vos notifications email et SMS
            {twilioConfigured ? " (Twilio actif)" : " (Twilio non configuré — mode console en dev)"}.
          </p>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.emailEnabled}
                onChange={(e) => void save({ emailEnabled: e.target.checked })}
                disabled={saving}
                className="rounded border-gray/60"
              />
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.smsEnabled}
                onChange={(e) => void save({ smsEnabled: e.target.checked })}
                disabled={saving || !prefs.smsPhone?.trim()}
                className="rounded border-gray/60"
              />
              <Smartphone className="h-4 w-4 text-primary" aria-hidden />
              SMS
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-text">Mobile SMS</span>
              <input
                type="tel"
                placeholder="+2250700000000"
                value={prefs.smsPhone ?? ""}
                onChange={(e) => setPrefs({ ...prefs, smsPhone: e.target.value || null })}
                onBlur={() => void save({ smsPhone: prefs.smsPhone ?? null })}
                className={`${fieldClass} w-44`}
                aria-label="Numéro SMS"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-text">Défaut (min avant)</span>
              <input
                type="number"
                min={0}
                max={1440}
                value={prefs.defaultLeadMinutes}
                onChange={(e) => setPrefs({ ...prefs, defaultLeadMinutes: Number(e.target.value) })}
                onBlur={() => void save({ defaultLeadMinutes: prefs.defaultLeadMinutes })}
                className={`${fieldClass} w-20`}
                aria-label="Minutes avant rappel par défaut"
              />
            </label>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {editableTypes.map((type) => {
              const typePrefs = prefs.types[type] ?? { email: true, sms: false };
              return (
                <li
                  key={type}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border border-gray/20 bg-white/80 px-3 py-2 text-xs",
                    CALENDAR_ITEM_COLORS[type],
                  )}
                >
                  <span className="font-medium">{CALENDAR_ITEM_LABELS[type]}</span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={typePrefs.email !== false}
                        onChange={(e) => {
                          const types = {
                            ...prefs.types,
                            [type]: { ...typePrefs, email: e.target.checked },
                          };
                          setPrefs({ ...prefs, types });
                          void save({ types });
                        }}
                        disabled={saving || !prefs.emailEnabled}
                      />
                      @
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={typePrefs.sms === true}
                        onChange={(e) => {
                          const types = {
                            ...prefs.types,
                            [type]: { ...typePrefs, sms: e.target.checked },
                          };
                          setPrefs({ ...prefs, types });
                          void save({ types });
                        }}
                        disabled={saving || !prefs.smsEnabled}
                      />
                      SMS
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          {message && <p className="mt-3 text-xs text-gray-text">{message}</p>}
        </div>
      </div>
    </div>
  );
}
