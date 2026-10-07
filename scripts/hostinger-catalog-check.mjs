#!/usr/bin/env node
/**
 * Vérification LECTURE SEULE du catalogue Hostinger (API officielle) :
 * quels packs d'hébergement (Single, Premium, Business, Cloud…) y figurent, avec quels prix ?
 *
 * Usage sur le VPS (le jeton est lu dans l'environnement du conteneur, jamais affiché) :
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T app \
 *     node --input-type=module < scripts/hostinger-catalog-check.mjs
 *
 * Variable requise : HOSTINGER_API_TOKEN (dans .env.docker).
 */

const API = "https://developers.hostinger.com/api/billing/v1/catalog";
const token = process.env.HOSTINGER_API_TOKEN?.trim();

if (!token) {
  console.error("HOSTINGER_API_TOKEN absent de l'environnement du conteneur (.env.docker + redémarrage ?).");
  process.exit(1);
}

const res = await fetch(API, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});

if (!res.ok) {
  const body = (await res.text()).slice(0, 300);
  console.error(`Erreur API Hostinger : HTTP ${res.status}`);
  console.error(body);
  if (res.status === 401) console.error("→ Jeton invalide ou expiré : régénérez-le dans hPanel > Informations du compte > API.");
  process.exit(1);
}

const json = await res.json();
const items = Array.isArray(json) ? json : (json.data ?? json.items ?? []);

console.log(`Articles au catalogue : ${items.length}`);

const byCategory = new Map();
for (const item of items) {
  const category = item.category ?? "(sans catégorie)";
  if (!byCategory.has(category)) byCategory.set(category, []);
  byCategory.get(category).push(item);
}

// Liste complète (compacte) : tous les packs, toutes catégories.
console.log("\n=== Tous les articles, par catégorie ===");
for (const [category, list] of byCategory) {
  console.log(`\n[${category}] — ${list.length} article(s)`);
  for (const item of list) console.log(`  - ${item.name ?? "(sans nom)"}  (id: ${item.id ?? "?"})`);
}

// Hébergement web : détail des prix (centimes) pour chaque pack.
const isHosting = (item) =>
  /hosting|web|shared|cloud|wordpress|single|premium|business|starter/i.test(
    `${item.id ?? ""} ${item.name ?? ""} ${item.category ?? ""}`,
  ) && !/domain|vps|email/i.test(`${item.category ?? ""}`);
const hosting = items.filter(isHosting);

if (!hosting.length) {
  console.log("\n✗ Aucun pack d'hébergement web trouvé : l'API ne couvre pas ces produits.");
  console.log("  → Automatisation via l'API impossible ; garder la saisie manuelle + rappel 60 jours.");
  process.exit(0);
}

/** Montant en centimes → « 28,70 » (ou « ? » si absent). */
const eur = (cents) => (typeof cents === "number" ? (cents / 100).toFixed(2).replace(".", ",") : "?");

console.log(`\n=== ✓ ${hosting.length} pack(s) d'hébergement web — prix par durée ===`);
for (const item of hosting) {
  console.log(`\n• ${item.name ?? "(sans nom)"} — id: ${item.id ?? "?"} — catégorie: ${item.category ?? "?"}`);
  const prices = Array.isArray(item.prices) ? item.prices : [];
  if (prices.length) {
    // Tableau lisible : une ligne par durée (1, 12, 24, 48 mois…), champs connus si présents.
    console.table(
      prices.map((p) => ({
        durée: `${p.period ?? "?"} ${p.period_unit ?? ""}`.trim(),
        devise: p.currency ?? "?",
        "prix 1re période": eur(p.first_period_price),
        "prix (renouvellement)": eur(p.price),
        id: p.id ?? "",
      })),
    );
  }
  // Brut complet, au cas où les champs diffèrent de ceux attendus.
  console.log(JSON.stringify(item.prices ?? item.price ?? item, null, 2));
}
