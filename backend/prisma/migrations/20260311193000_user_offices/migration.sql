ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON "User"("cpf");

ALTER TABLE "Office" ADD COLUMN IF NOT EXISTS "domain" TEXT;

CREATE TABLE IF NOT EXISTS "UserOffice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'BASIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserOffice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserOffice_userId_officeId_key" ON "UserOffice"("userId", "officeId");

DO $$
BEGIN
  BEGIN
    ALTER TABLE "UserOffice" ADD CONSTRAINT "UserOffice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE "UserOffice" ADD CONSTRAINT "UserOffice_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

INSERT INTO "UserOffice" ("id", "userId", "officeId", "role", "createdAt")
SELECT concat("User"."id", '_', "User"."officeId"), "User"."id", "User"."officeId", COALESCE("User"."role", 'BASIC'), CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."officeId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "UserOffice" WHERE "UserOffice"."userId" = "User"."id" AND "UserOffice"."officeId" = "User"."officeId"
);
