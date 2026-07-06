# SD CREATIV

**Agence web & solutions digitales** — Abidjan, Côte d'Ivoire.

SD CREATIV accompagne PME et entrepreneurs dans leur présence en ligne : sites vitrines, e-commerce, identité visuelle, SEO local, automatisation et outils métier sur mesure.

- Site prod : [sdcreativ.com](https://sdcreativ.com)
- Guide déploiement VPS : [docs/DEPLOIEMENT-SDCREATIV-COM.md](docs/DEPLOIEMENT-SDCREATIV-COM.md)

## Déploiement Docker

| Mode | Commande | URL |
|------|----------|-----|
| Dev local | `docker compose up -d --build` | http://localhost:3001 |
| Production VPS | `./scripts/docker-prod-deploy.sh` | https://sdcreativ.com |

Guide complet : [docs/DOCKER-PRODUCTION.md](docs/DOCKER-PRODUCTION.md)
