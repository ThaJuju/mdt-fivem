ALTER TABLE "Call" ADD COLUMN "departmentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "UnitType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UnitType"
ADD CONSTRAINT "UnitType_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "UnitType_departmentId_name_key" ON "UnitType"("departmentId", "name");
CREATE INDEX "UnitType_departmentId_isActive_idx" ON "UnitType"("departmentId", "isActive");

ALTER TABLE "Unit" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "typeId" TEXT;

UPDATE "Unit" u
SET "departmentId" = source."departmentId"
FROM (
  SELECT DISTINCT ON (um."unitId") um."unitId", m."departmentId"
  FROM "UnitMember" um
  JOIN "Membership" m ON m."userId" = um."userId" AND m."status" = 'ACTIVE'
  ORDER BY um."unitId", m."isPrimary" DESC, m."createdAt"
) source
WHERE source."unitId" = u."id";

UPDATE "Unit"
SET "departmentId" = (
  SELECT "id" FROM "Department"
  WHERE "isActive" = true AND "type" IN ('POLICE', 'EMS')
  ORDER BY "order", "id" LIMIT 1
)
WHERE "departmentId" IS NULL;

INSERT INTO "UnitType" ("id", "name", "departmentId", "updatedAt")
SELECT 'legacy_' || md5(u."departmentId" || ':' || u."type"), u."type", u."departmentId", CURRENT_TIMESTAMP
FROM "Unit" u
GROUP BY u."departmentId", u."type"
ON CONFLICT ("departmentId", "name") DO NOTHING;

INSERT INTO "UnitType" ("id", "name", "departmentId", "order", "updatedAt")
SELECT 'default_' || md5(d."id" || ':' || defaults.name), defaults.name, d."id", defaults.position, CURRENT_TIMESTAMP
FROM "Department" d
CROSS JOIN (VALUES ('Patrouille', 10), ('K9', 20), ('SWAT', 30)) AS defaults(name, position)
WHERE d."type" = 'POLICE'
ON CONFLICT ("departmentId", "name") DO NOTHING;

INSERT INTO "UnitType" ("id", "name", "departmentId", "order", "updatedAt")
SELECT 'default_' || md5(d."id" || ':' || defaults.name), defaults.name, d."id", defaults.position, CURRENT_TIMESTAMP
FROM "Department" d
CROSS JOIN (VALUES ('Ambulance', 10), ('VSAV', 20), ('SMUR', 30)) AS defaults(name, position)
WHERE d."type" = 'EMS'
ON CONFLICT ("departmentId", "name") DO NOTHING;

UPDATE "Unit" u
SET "typeId" = t."id"
FROM "UnitType" t
WHERE t."departmentId" = u."departmentId" AND t."name" = u."type";

UPDATE "Call" c
SET "departmentIds" = source.ids
FROM (
  SELECT cu."callId", array_agg(DISTINCT u."departmentId") AS ids
  FROM "CallUnit" cu
  JOIN "Unit" u ON u."id" = cu."unitId"
  GROUP BY cu."callId"
) source
WHERE source."callId" = c."id";

UPDATE "Call"
SET "departmentIds" = ARRAY[
  (SELECT "id" FROM "Department" WHERE "isActive" = true AND "type" IN ('POLICE', 'EMS') ORDER BY "order", "id" LIMIT 1)
]
WHERE cardinality("departmentIds") = 0;

ALTER TABLE "Unit" ALTER COLUMN "departmentId" SET NOT NULL;
ALTER TABLE "Unit" ALTER COLUMN "typeId" SET NOT NULL;
ALTER TABLE "Unit" DROP COLUMN "type";

ALTER TABLE "Unit"
ADD CONSTRAINT "Unit_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Unit"
ADD CONSTRAINT "Unit_typeId_fkey"
FOREIGN KEY ("typeId") REFERENCES "UnitType"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Unit_departmentId_idx" ON "Unit"("departmentId");
CREATE INDEX "Unit_typeId_idx" ON "Unit"("typeId");
CREATE UNIQUE INDEX "Unit_departmentId_callsign_key" ON "Unit"("departmentId", "callsign");
