DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lead_code_seq') THEN
    CREATE SEQUENCE lead_code_seq START 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'client_code_seq') THEN
    CREATE SEQUENCE client_code_seq START 1;
  END IF;
END $$;
