-- Seed comptes portail demo → fiches CRM + projets + jalons
-- Usage : npm run db:seed-portal  (DATABASE_URL requis)

DO $$
DECLARE
  cid UUID;
  pid UUID;
BEGIN
  -- ── mode-style-abidjan ──────────────────────────────────────────────
  SELECT id INTO cid FROM clients WHERE portal_client_id = 'mode-style-abidjan';

  IF cid IS NULL THEN
    INSERT INTO clients (name, email, company, status, portal_client_id, metadata)
    VALUES (
      'Aya Traoré',
      'aya@mode-style-abidjan.ci',
      'Mode & Style Abidjan',
      'active',
      'mode-style-abidjan',
      '{"paidAmount": 1400000}'::jsonb
    )
    RETURNING id INTO cid;
  ELSE
    UPDATE clients SET
      name = 'Aya Traoré',
      email = 'aya@mode-style-abidjan.ci',
      company = 'Mode & Style Abidjan',
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"paidAmount": 1400000}'::jsonb,
      updated_at = NOW()
    WHERE id = cid;
  END IF;

  SELECT id INTO pid FROM projects WHERE client_id = cid ORDER BY updated_at DESC LIMIT 1;

  IF pid IS NULL THEN
    INSERT INTO projects (
      client_id, name, type, status, progress,
      start_date, due_date, budget, description, metadata
    ) VALUES (
      cid,
      'Site e-commerce — Mode & Style',
      'ecommerce',
      'testing',
      85,
      '2026-02-01',
      '2026-05-15',
      2800000,
      'Boutique en ligne Mode & Style Abidjan — catalogue, paiement mobile money.',
      '{"paymentSchedule":[{"label":"Acompte à la signature","amount":1400000,"status":"paid","date":"15 mars 2026"},{"label":"Solde à la livraison","amount":1400000,"status":"pending","date":"15 mai 2026"}]}'::jsonb
    )
    RETURNING id INTO pid;

    INSERT INTO project_milestones (project_id, label, sort_order, status, completed_at) VALUES
      (pid, 'Brief validé', 0, 'done', NOW() - INTERVAL '60 days'),
      (pid, 'Design', 1, 'done', NOW() - INTERVAL '40 days'),
      (pid, 'Développement', 2, 'done', NOW() - INTERVAL '15 days'),
      (pid, 'Tests', 3, 'current', NULL),
      (pid, 'Mise en ligne', 4, 'upcoming', NULL);
  ELSE
    UPDATE projects SET
      name = 'Site e-commerce — Mode & Style',
      type = 'ecommerce',
      status = 'testing',
      progress = 85,
      start_date = '2026-02-01',
      due_date = '2026-05-15',
      budget = 2800000,
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"paymentSchedule":[{"label":"Acompte à la signature","amount":1400000,"status":"paid","date":"15 mars 2026"},{"label":"Solde à la livraison","amount":1400000,"status":"pending","date":"15 mai 2026"}]}'::jsonb,
      updated_at = NOW()
    WHERE id = pid;
  END IF;

  -- ── demo-client ─────────────────────────────────────────────────────
  SELECT id INTO cid FROM clients WHERE portal_client_id = 'demo-client';

  IF cid IS NULL THEN
    INSERT INTO clients (name, email, company, status, portal_client_id, metadata)
    VALUES (
      'Jean Koffi',
      'jean@bonappetit.ci',
      'Restaurant Bon Appétit',
      'active',
      'demo-client',
      '{"paidAmount": 750000}'::jsonb
    )
    RETURNING id INTO cid;
  ELSE
    UPDATE clients SET
      name = 'Jean Koffi',
      email = 'jean@bonappetit.ci',
      company = 'Restaurant Bon Appétit',
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"paidAmount": 750000}'::jsonb,
      updated_at = NOW()
    WHERE id = cid;
  END IF;

  SELECT id INTO pid FROM projects WHERE client_id = cid ORDER BY updated_at DESC LIMIT 1;

  IF pid IS NULL THEN
    INSERT INTO projects (
      client_id, name, type, status, progress,
      start_date, due_date, budget, description, metadata
    ) VALUES (
      cid,
      'Site vitrine — Restaurant Bon Appétit',
      'site_vitrine',
      'development',
      70,
      '2026-03-15',
      '2026-06-30',
      1500000,
      'Site vitrine restaurant avec menu, réservations et galerie photos.',
      '{"paymentSchedule":[{"label":"Acompte à la signature","amount":750000,"status":"paid","date":"15 mars 2026"},{"label":"Solde à la livraison","amount":750000,"status":"pending","date":"30 juin 2026"}]}'::jsonb
    )
    RETURNING id INTO pid;

    INSERT INTO project_milestones (project_id, label, sort_order, status, completed_at) VALUES
      (pid, 'Brief validé', 0, 'done', NOW() - INTERVAL '45 days'),
      (pid, 'Design', 1, 'done', NOW() - INTERVAL '25 days'),
      (pid, 'Développement', 2, 'current', NULL),
      (pid, 'Tests', 3, 'upcoming', NULL),
      (pid, 'Mise en ligne', 4, 'upcoming', NULL);
  ELSE
    UPDATE projects SET
      name = 'Site vitrine — Restaurant Bon Appétit',
      type = 'site_vitrine',
      status = 'development',
      progress = 70,
      start_date = '2026-03-15',
      due_date = '2026-06-30',
      budget = 1500000,
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"paymentSchedule":[{"label":"Acompte à la signature","amount":750000,"status":"paid","date":"15 mars 2026"},{"label":"Solde à la livraison","amount":750000,"status":"pending","date":"30 juin 2026"}]}'::jsonb,
      updated_at = NOW()
    WHERE id = pid;
  END IF;

  RAISE NOTICE 'Seed portail demo terminé (mode-style-abidjan, demo-client).';
END $$;

-- Code d'accès dev local : DevPortail2026! (hash SHA-256)
UPDATE clients
SET portal_access_token_hash = '2473ff8fd1b6f0d8239be2f427f830c2eede2b721cd60cc09fe5012c81a66c3b',
    portal_access_created_at = COALESCE(portal_access_created_at, NOW())
WHERE portal_client_id IN ('demo-client', 'mode-style-abidjan')
  AND portal_access_token_hash IS NULL;
