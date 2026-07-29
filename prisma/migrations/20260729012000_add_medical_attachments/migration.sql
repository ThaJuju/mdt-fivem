-- CreateTable
CREATE TABLE "MedicalAttachment" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalAttachment_citizenId_idx" ON "MedicalAttachment"("citizenId");

-- AddForeignKey
ALTER TABLE "MedicalAttachment" ADD CONSTRAINT "MedicalAttachment_citizenId_fkey"
FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
