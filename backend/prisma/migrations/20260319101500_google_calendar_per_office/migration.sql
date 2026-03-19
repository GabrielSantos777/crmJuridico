-- Mantem apenas uma conexao Google Calendar por escritorio.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "officeId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM "GoogleCalendarConnection"
)
DELETE FROM "GoogleCalendarConnection" AS gc
USING ranked
WHERE gc.id = ranked.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "GoogleCalendarConnection_userId_officeId_key";
DROP INDEX IF EXISTS "GoogleCalendarConnection_officeId_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarConnection_officeId_key"
  ON "GoogleCalendarConnection"("officeId");

CREATE INDEX IF NOT EXISTS "GoogleCalendarConnection_userId_idx"
  ON "GoogleCalendarConnection"("userId");
