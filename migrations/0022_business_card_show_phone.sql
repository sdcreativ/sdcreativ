-- Les cartes créées avec le défaut « téléphone masqué » n'affichaient pas l'appel.
-- Le numéro reste celui du compte CRM ; on peut toujours le masquer ensuite.

ALTER TABLE digital_business_cards
  ALTER COLUMN show_phone SET DEFAULT true;

UPDATE digital_business_cards
SET show_phone = true
WHERE show_phone = false;
