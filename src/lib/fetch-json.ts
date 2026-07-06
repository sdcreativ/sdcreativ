type ApiError = { error?: string };

/** Parse une réponse fetch CRM — message clair si le serveur renvoie du HTML (404, redirect, etc.). */
export async function parseFetchJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      throw new Error(
        `Réponse invalide (${res.status}) pour ${new URL(res.url).pathname} — attendu JSON.`,
      );
    }
    throw new Error(`Réponse invalide (${res.status}) — type ${contentType || "inconnu"}.`);
  }

  let json: T & ApiError;
  try {
    json = JSON.parse(text) as T & ApiError;
  } catch {
    throw new Error(`Réponse JSON invalide (${res.status}) pour ${new URL(res.url).pathname}.`);
  }

  if (!res.ok) {
    throw new Error(json.error ?? "Une erreur est survenue.");
  }

  return json;
}
