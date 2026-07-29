ALTER TABLE "Citizen"
ADD COLUMN "isMedicalOnly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Citizen"
SET "isMedicalOnly" = true
WHERE "id" IN (
  SELECT "entityId"
  FROM "AuditLog"
  WHERE "action" = 'medical.patient.create'
    AND "entityId" IS NOT NULL
);
