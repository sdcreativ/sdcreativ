/**
 * Compresse les PNG du dossier public/images (max 1600px, palette optimisée).
 * Usage : node scripts/compress-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public/images");
const SKIP = new Set(["maquette-accueil.png"]);

async function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.name.endsWith(".png") || SKIP.has(entry.name)) continue;

    const before = fs.statSync(full).size;
    const buffer = await sharp(full)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
      .toBuffer();

    if (buffer.length < before) {
      fs.writeFileSync(full, buffer);
      const saved = ((before - buffer.length) / before) * 100;
      console.log(`${full}: ${format(before)} → ${format(buffer.length)} (-${saved.toFixed(0)}%)`);
    } else {
      console.log(`${full}: déjà optimisé (${format(before)})`);
    }
  }
}

function format(bytes) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

await walk(ROOT);
console.log("Compression terminée.");
