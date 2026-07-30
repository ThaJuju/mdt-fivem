ALTER TABLE "Charge"
ADD COLUMN "bail" INTEGER,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "paidById" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Charge" AS c
SET
  "bail" = o."bail",
  "createdAt" = r."createdAt",
  "paidAt" = CASE WHEN c."isPaid" THEN CURRENT_TIMESTAMP ELSE NULL END
FROM "Offense" AS o, "Report" AS r
WHERE c."offenseId" = o.id AND c."reportId" = r.id;

ALTER TABLE "Charge"
ADD CONSTRAINT "Charge_paidById_fkey"
FOREIGN KEY ("paidById") REFERENCES "User"(id)
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Charge_isPaid_createdAt_idx" ON "Charge"("isPaid", "createdAt");
CREATE INDEX "Charge_paidById_idx" ON "Charge"("paidById");

UPDATE "Grade"
SET permissions = array_append(permissions, 'charges.collect')
WHERE 'charges.manage' = ANY(permissions)
  AND NOT ('charges.collect' = ANY(permissions));
