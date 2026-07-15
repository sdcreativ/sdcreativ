/** Lecture runtime des variables NEXT_PUBLIC_* (non inlinées au build Next.js). */
export function readPublicEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}
