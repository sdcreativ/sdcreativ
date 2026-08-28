import net from "node:net";

const DEFAULT_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 15_000;
const CHUNK_SIZE = 8192;
/** Aligné sur CLAMD_CONF_StreamMaxLength du sidecar. */
export const CLAMAV_MAX_SCAN_BYTES = 25 * 1024 * 1024;

export class InfectedFileError extends Error {
  readonly signature: string;

  constructor(signature: string) {
    super("Fichier refusé : contenu malveillant détecté.");
    this.name = "InfectedFileError";
    this.signature = signature;
  }
}

export class ClamAvUnavailableError extends Error {
  constructor(message = "Antivirus indisponible. Réessayez dans un instant.") {
    super(message);
    this.name = "ClamAvUnavailableError";
  }
}

export function isClamAvEnabled(): boolean {
  const flag = process.env.CLAMAV_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return Boolean(process.env.CLAMAV_HOST?.trim());
}

export function parseClamdReply(raw: string): "clean" | { infected: string } {
  const text = raw.replace(/\u0000/g, " ").trim();
  if (/\bFOUND\b/i.test(text)) {
    const match = text.match(/:\s*(.+?)\s+FOUND/i);
    return { infected: match?.[1]?.trim() || "unknown" };
  }
  if (/\bOK\b/i.test(text)) return "clean";
  if (/\bERROR\b/i.test(text)) {
    throw new ClamAvUnavailableError(text.slice(0, 200));
  }
  throw new ClamAvUnavailableError("Réponse antivirus inattendue.");
}

function clamavHost(): string {
  return process.env.CLAMAV_HOST?.trim() || "clamav";
}

function clamavPort(): number {
  const parsed = Number.parseInt(process.env.CLAMAV_PORT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function clamavTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.CLAMAV_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function failOpen(): boolean {
  const flag = process.env.CLAMAV_FAIL_OPEN?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

async function scanBuffer(buffer: Buffer): Promise<"clean"> {
  if (buffer.length > CLAMAV_MAX_SCAN_BYTES) {
    throw new ClamAvUnavailableError("Fichier trop volumineux pour l’analyse antivirus.");
  }

  const reply = await instream(buffer);
  const parsed = parseClamdReply(reply);
  if (parsed === "clean") return "clean";
  throw new InfectedFileError(parsed.infected);
}

function instream(buffer: Buffer): Promise<string> {
  const host = clamavHost();
  const port = clamavPort();
  const timeoutMs = clamavTimeoutMs();

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (error?: Error, data?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(data ?? "");
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(new ClamAvUnavailableError("Délai d’attente antivirus.")));
    socket.on("error", (error) =>
      finish(new ClamAvUnavailableError(error.message || "Connexion antivirus impossible.")),
    );
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => finish(undefined, Buffer.concat(chunks).toString("utf8")));

    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const slice = buffer.subarray(offset, offset + CHUNK_SIZE);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(slice.length, 0);
        socket.write(header);
        socket.write(slice);
      }
      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      socket.write(end);
    });
  });
}

/**
 * Analyse un fichier utilisateur (upload, PJ mail) via clamd.
 * Désactivé hors Docker / sans CLAMAV_ENABLED.
 */
export async function assertCleanUpload(buffer: Buffer): Promise<void> {
  if (!isClamAvEnabled() || buffer.length === 0) return;

  try {
    await scanBuffer(buffer);
  } catch (error) {
    if (error instanceof InfectedFileError) {
      console.warn("[clamav] infected upload", { signature: error.signature });
      throw error;
    }
    if (failOpen()) {
      console.error("[clamav] scan skipped (fail-open)", error);
      return;
    }
    if (error instanceof ClamAvUnavailableError) throw error;
    throw new ClamAvUnavailableError();
  }
}
