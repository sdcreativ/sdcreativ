import { HONEYPOT_FIELD } from "@/lib/spam-guard";

/** Champ piège invisible — laisser vide ; les bots le remplissent souvent. */
export function HoneypotField() {
  return (
    <input
      type="text"
      name={HONEYPOT_FIELD}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
    />
  );
}
