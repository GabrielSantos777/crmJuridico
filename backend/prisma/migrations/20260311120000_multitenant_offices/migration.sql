DO $$
BEGIN
  BEGIN
    ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE TABLE IF NOT EXISTS "Office" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Office_cnpj_key" ON "Office"("cnpj");

INSERT INTO "Office" ("id", "name", "cnpj")
SELECT 'office_default', 'Onefy Labs Associados Teste', '04.325.979/0001-29'
WHERE NOT EXISTS (SELECT 1 FROM "Office" WHERE "cnpj" = '04.325.979/0001-29');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "User" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;


ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Lead" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Client" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Client" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Process" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Process" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Appointment" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Appointment" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "LegalDeadline" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "LegalDeadline" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "LegalDeadline" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Conversation" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Conversation" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Notification" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Notification" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "Group" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "Group" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "KanbanColumn" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "KanbanColumn" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "KanbanColumn" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "KanbanCard" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "KanbanCard" ALTER COLUMN "officeId" SET NOT NULL;

ALTER TABLE "OfficeSettings" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
UPDATE "OfficeSettings" SET "officeId" = 'office_default' WHERE "officeId" IS NULL;
ALTER TABLE "OfficeSettings" ALTER COLUMN "officeId" SET NOT NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Process" ADD CONSTRAINT "Process_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "LegalDeadline" ADD CONSTRAINT "LegalDeadline_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "Group" ADD CONSTRAINT "Group_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "OfficeSettings" ADD CONSTRAINT "OfficeSettings_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DROP INDEX IF EXISTS "Lead_code_key";
DROP INDEX IF EXISTS "Client_code_key";
DROP INDEX IF EXISTS "Process_code_key";
DROP INDEX IF EXISTS "Process_number_key";
DROP INDEX IF EXISTS "Conversation_channel_phone_key";
DROP INDEX IF EXISTS "Appointment_externalSource_externalId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_officeId_code_key" ON "Lead"("officeId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_officeId_code_key" ON "Client"("officeId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Process_officeId_code_key" ON "Process"("officeId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Process_officeId_number_key" ON "Process"("officeId", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_officeId_channel_phone_key" ON "Conversation"("officeId", "channel", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_officeId_externalSource_externalId_key" ON "Appointment"("officeId", "externalSource", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfficeSettings_officeId_key" ON "OfficeSettings"("officeId");
