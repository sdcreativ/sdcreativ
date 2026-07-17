# Migrations SQL versionnées

Fichiers `NNNN_description.sql` appliqués automatiquement au démarrage via `src/lib/migrate.ts` / `ensureSchema()`.

- Table de suivi : `schema_migrations(version, applied_at)`
- Chaque fichier n’est exécuté **qu’une fois**
- Les seeds runtime (rôles, templates, admin bootstrap) restent dans `src/lib/db.ts` après les migrations

## Ajouter une migration

1. Créer `migrations/0003_mon_changement.sql`
2. SQL idempotent de préférence (`IF NOT EXISTS`, etc.)
3. Déployer — appliqué au prochain démarrage qui touche la DB
