-- Registration normalizes emails to lowercase. Keep the database boundary
-- case-insensitive as well, so concurrent registrations cannot create aliases.
DO $$
BEGIN
  IF EXISTS (
    SELECT lower(email)
      FROM usuarios
     GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create the case-insensitive email index while duplicate emails exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_lower
    ON usuarios (lower(email));
