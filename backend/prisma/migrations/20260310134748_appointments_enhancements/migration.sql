-- Add enums if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppointmentType') THEN
    CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION','AUDIENCE','DOCUMENT','MEETING','OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppointmentMode') THEN
    CREATE TYPE "AppointmentMode" AS ENUM ('ONLINE','IN_PERSON');
  END IF;
END $$;

-- Extend AppointmentStatus enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AppointmentStatus' AND e.enumlabel = 'AVAILABLE'
  ) THEN
    ALTER TYPE "AppointmentStatus" ADD VALUE 'AVAILABLE';
  END IF;
END $$;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
  ADD COLUMN IF NOT EXISTS "mode" "AppointmentMode" NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "externalSource" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_externalSource_externalId_key" ON "Appointment"("externalSource", "externalId");
