ALTER TABLE "Property"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Warrant"
ADD COLUMN "propertyId" TEXT;

CREATE INDEX "Warrant_propertyId_idx" ON "Warrant"("propertyId");

ALTER TABLE "Warrant"
ADD CONSTRAINT "Warrant_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Grade"
SET "permissions" = array_append("permissions", 'properties.view')
WHERE 'citizens.view' = ANY("permissions")
  AND NOT ('properties.view' = ANY("permissions"));

UPDATE "Grade"
SET "permissions" = array_append("permissions", 'properties.create')
WHERE 'citizens.create' = ANY("permissions")
  AND NOT ('properties.create' = ANY("permissions"));

UPDATE "Grade"
SET "permissions" = array_append("permissions", 'properties.edit')
WHERE 'citizens.edit' = ANY("permissions")
  AND NOT ('properties.edit' = ANY("permissions"));

UPDATE "Grade"
SET "permissions" = array_append("permissions", 'properties.delete')
WHERE 'citizens.delete' = ANY("permissions")
  AND NOT ('properties.delete' = ANY("permissions"));
