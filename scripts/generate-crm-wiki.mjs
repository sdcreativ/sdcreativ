#!/usr/bin/env node
/**
 * Génère le wiki Markdown (dossier wiki/) depuis src/content/crm-docs/catalog.ts
 * Usage : node scripts/generate-crm-wiki.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "src/content/crm-docs/catalog.ts");
const outDir = path.join(root, "wiki");

const SITE = "https://sdcreativ.com";
const RAW_IMG =
  "https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs";

const src = fs.readFileSync(catalogPath, "utf8");

function extractArrayBlocks(constName) {
  const start = src.indexOf(`export const ${constName}`);
  if (start < 0) throw new Error(`Const ${constName} introuvable`);
  const eq = src.indexOf("=", start);
  const brace = src.indexOf("[", eq);
  if (brace < 0) throw new Error(`Tableau introuvable pour ${constName}`);
  let depth = 0;
  let end = -1;
  let quote = null;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (quote) {
      if (ch === quote && prev !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error(`Fin de tableau introuvable pour ${constName}`);
  return src.slice(brace, end + 1);
}

function parseString(value) {
  return value
    .replace(/^['"`]|['"`]$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`");
}

function skipString(s, i) {
  const quote = s[i];
  i++;
  while (i < s.length) {
    if (s[i] === "\\") {
      i += 2;
      continue;
    }
    if (s[i] === quote) return i + 1;
    i++;
  }
  return i;
}

function parseObjectLiterals(arraySrc) {
  const items = [];
  let i = 1; // skip [
  while (i < arraySrc.length) {
    while (i < arraySrc.length && /\s|,/.test(arraySrc[i])) i++;
    if (arraySrc[i] === "]") break;
    if (arraySrc[i] !== "{") {
      i++;
      continue;
    }
    let depth = 0;
    const start = i;
    for (; i < arraySrc.length; i++) {
      const ch = arraySrc[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(arraySrc, i) - 1;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const body = arraySrc.slice(start + 1, i - 1);
    const obj = {};
    const fieldRe =
      /(\w+)\s*:\s*(?:`([\s\S]*?)`|"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\[[\s\S]*?\])|(true|false))/g;
    let m;
    while ((m = fieldRe.exec(body))) {
      const key = m[1];
      if (m[2] !== undefined) obj[key] = parseString(m[2]);
      else if (m[3] !== undefined) obj[key] = parseString(m[3]);
      else if (m[4] !== undefined) obj[key] = parseString(m[4]);
      else if (m[5] !== undefined) {
        obj[key] = [...m[5].matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => x[1]);
      } else if (m[6] !== undefined) obj[key] = m[6] === "true";
    }
    if (obj.id || obj.title) items.push(obj);
  }
  return items;
}

const categories = parseObjectLiterals(extractArrayBlocks("CRM_DOC_CATEGORIES"));
const features = parseObjectLiterals(extractArrayBlocks("CRM_DOC_FEATURES"));

function slugify(label) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "et")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function absHref(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `${SITE}${href}`;
}

function renderFeature(f) {
  const lines = [];
  lines.push(`### ${f.title}${f.recent ? " · _Récent_" : ""}`);
  lines.push("");
  lines.push(`> ${f.summary}`);
  lines.push("");
  lines.push("**Explication**");
  lines.push("");
  lines.push(f.explanation);
  lines.push("");
  lines.push("**Fonctionnement**");
  lines.push("");
  lines.push(f.howItWorks);
  lines.push("");
  const link = absHref(f.href);
  if (link) {
    lines.push(`**Lien :** [${f.href}](${link})`);
    lines.push("");
  }
  if (Array.isArray(f.screenshots) && f.screenshots.length) {
    lines.push("**Captures**");
    lines.push("");
    for (const shot of f.screenshots) {
      lines.push(`![${f.title} — ${shot}](${RAW_IMG}/${shot})`);
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

fs.mkdirSync(outDir, { recursive: true });

const sidebar = ["## SD CREATIV CRM", "", "- [Accueil](Home)", ""];
for (const cat of categories) {
  const page = slugify(cat.label);
  sidebar.push(`- [${cat.label}](${page})`);
}
sidebar.push("");
sidebar.push("- [Nouveautés](Nouveautes)");
sidebar.push("- [Doc dans le CRM](https://sdcreativ.com/admin/crm/documentation)");
fs.writeFileSync(path.join(outDir, "_Sidebar.md"), `${sidebar.join("\n")}\n`);

const home = [];
home.push("# Wiki CRM SD CREATIV");
home.push("");
home.push(
  "Documentation interne des fonctionnalités : explication, fonctionnement, liens et captures.",
);
home.push("");
home.push(
  "> Consultation interactive aussi dans le CRM : [Admin → Documentation](https://sdcreativ.com/admin/crm/documentation).",
);
home.push("");
home.push(`**${features.length} fiches** · **${categories.length} catégories**`);
home.push("");
home.push("## Sommaire");
home.push("");
for (const cat of categories) {
  const page = slugify(cat.label);
  const count = features.filter((f) => f.category === cat.id).length;
  home.push(`- [[${cat.label}|${page}]] — ${cat.description} (${count})`);
}
home.push("");
home.push("## Nouveautés (juillet 2026)");
home.push("");
const recent = features.filter((f) => f.recent);
for (const f of recent) {
  const cat = categories.find((c) => c.id === f.category);
  const page = slugify(cat?.label ?? f.category);
  home.push(`- **${f.title}** → [[${cat?.label ?? f.category}|${page}]]`);
}
home.push("");
home.push("---");
home.push("");
home.push("_Généré automatiquement depuis `src/content/crm-docs/catalog.ts` via `scripts/generate-crm-wiki.mjs`._");
fs.writeFileSync(path.join(outDir, "Home.md"), `${home.join("\n")}\n`);

const nouveautes = [];
nouveautes.push("# Nouveautés");
nouveautes.push("");
nouveautes.push("Fonctionnalités marquées récentes (juillet 2026).");
nouveautes.push("");
for (const f of recent) {
  nouveautes.push(renderFeature(f));
}
fs.writeFileSync(path.join(outDir, "Nouveautes.md"), `${nouveautes.join("\n")}\n`);

for (const cat of categories) {
  const page = slugify(cat.label);
  const catFeatures = features.filter((f) => f.category === cat.id);
  const lines = [];
  lines.push(`# ${cat.label}`);
  lines.push("");
  lines.push(cat.description);
  lines.push("");
  lines.push(`[[← Accueil|Home]]`);
  lines.push("");
  for (const f of catFeatures) {
    lines.push(renderFeature(f));
  }
  fs.writeFileSync(path.join(outDir, `${page}.md`), `${lines.join("\n")}\n`);
}

const footer = `# Publier sur GitHub Wiki

\`\`\`bash
node scripts/generate-crm-wiki.mjs
# Activer le Wiki dans GitHub → Settings → Features → Wikis
git clone git@github.com:sdcreativ/sdcreativ.wiki.git /tmp/sdcreativ.wiki
rsync -a --delete --exclude .git wiki/ /tmp/sdcreativ.wiki/
cd /tmp/sdcreativ.wiki
git add -A && git commit -m "docs: sync wiki CRM" && git push
\`\`\`
`;
fs.writeFileSync(path.join(outDir, "README.md"), footer);

console.log(
  `Wiki généré dans wiki/ — ${categories.length} catégories, ${features.length} fiches, ${recent.length} nouveautés.`,
);
