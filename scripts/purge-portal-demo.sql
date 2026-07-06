-- Supprime les clients/projets de démonstration créés par seed-portal-demo.sql
-- Usage : npm run db:purge-portal-demo

DELETE FROM clients
WHERE portal_client_id IN ('demo-client', 'mode-style-abidjan');
