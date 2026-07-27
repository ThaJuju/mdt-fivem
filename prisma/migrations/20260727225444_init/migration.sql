-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('POLICE', 'EMS', 'DOJ', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'LOA', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('VALID', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OffenseType" AS ENUM ('INFRACTION', 'MISDEMEANOR', 'FELONY');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('INCIDENT', 'ARREST', 'CITATION', 'INVESTIGATION', 'FIELD_INTERVIEW', 'USE_OF_FORCE', 'EMS_INTERVENTION');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvolvementRole" AS ENUM ('SUSPECT', 'VICTIM', 'WITNESS', 'COMPLAINANT', 'PATIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OBJECT');

-- CreateEnum
CREATE TYPE "WarrantType" AS ENUM ('ARREST', 'SEARCH');

-- CreateEnum
CREATE TYPE "WarrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXECUTED', 'EXPIRED', 'DENIED');

-- CreateEnum
CREATE TYPE "BoloType" AS ENUM ('PERSON', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "Triage" AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED', 'BLACK');

-- CreateEnum
CREATE TYPE "EmsOutcome" AS ENUM ('TREATED_ON_SCENE', 'TRANSPORTED', 'REFUSED_CARE', 'DECEASED');

-- CreateEnum
CREATE TYPE "CallSource" AS ENUM ('EMERGENCY', 'NON_EMERGENCY', 'OFFICER');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'CLOSED');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'BUSY', 'EN_ROUTE', 'ON_SCENE', 'PANIC', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "DisciplineType" AS ENUM ('COMMENDATION', 'VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION', 'DEMOTION', 'TERMINATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "type" "DepartmentType" NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "permissions" TEXT[],
    "salary" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "callsign" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "height" INTEGER,
    "weight" INTEGER,
    "hairColor" TEXT,
    "eyeColor" TEXT,
    "address" TEXT,
    "postal" TEXT,
    "phone" TEXT,
    "occupation" TEXT,
    "imageUrl" TEXT,
    "fingerprint" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "deceasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenNote" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'VALID',
    "points" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT,
    "class" TEXT,
    "vin" TEXT,
    "ownerId" TEXT,
    "registration" "DocumentStatus" NOT NULL DEFAULT 'VALID',
    "insurance" "DocumentStatus" NOT NULL DEFAULT 'VALID',
    "isStolen" BOOLEAN NOT NULL DEFAULT false,
    "isImpounded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "type" TEXT,
    "ownerId" TEXT,
    "isStolen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT,
    "citizenId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenalCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PenalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offense" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "type" "OffenseType" NOT NULL,
    "fine" INTEGER NOT NULL,
    "jailMinutes" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "bail" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Offense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "callId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportInvolvement" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "role" "InvolvementRole" NOT NULL,
    "statement" TEXT,

    CONSTRAINT "ReportInvolvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportOfficer" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReportOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportVehicle" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "ReportVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "kind" "EvidenceKind" NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "offenseId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "fine" INTEGER NOT NULL,
    "jailMinutes" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "isGuilty" BOOLEAN NOT NULL DEFAULT true,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warrant" (
    "id" TEXT NOT NULL,
    "type" "WarrantType" NOT NULL,
    "citizenId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "address" TEXT,
    "status" "WarrantStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bolo" (
    "id" TEXT NOT NULL,
    "type" "BoloType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "citizenId" TEXT,
    "vehicleId" TEXT,
    "plate" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "notes" TEXT,
    "isFitForDuty" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmsDetail" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "triage" "Triage" NOT NULL,
    "chiefComplaint" TEXT,
    "injuries" TEXT,
    "treatment" TEXT,
    "medications" TEXT,
    "outcome" "EmsOutcome" NOT NULL,
    "hospital" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),

    CONSTRAINT "EmsDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "source" "CallSource" NOT NULL,
    "code" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "postal" TEXT,
    "callerName" TEXT,
    "callerPhone" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "tags" TEXT[],
    "closedAt" TIMESTAMP(3),
    "closeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'OFF_DUTY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitMember" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnitMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallUnit" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatusCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "departmentId" TEXT,
    "authorId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "validMonths" INTEGER,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCertification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DisciplineType" NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "durationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_lastName_firstName_idx" ON "User"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_shortName_key" ON "Department"("shortName");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE INDEX "Grade_departmentId_idx" ON "Grade"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_departmentId_level_key" ON "Grade"("departmentId", "level");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_departmentId_status_idx" ON "Membership"("departmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_departmentId_badgeNumber_key" ON "Membership"("departmentId", "badgeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_fingerprint_key" ON "Citizen"("fingerprint");

-- CreateIndex
CREATE INDEX "Citizen_lastName_firstName_idx" ON "Citizen"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "CitizenNote_citizenId_idx" ON "CitizenNote"("citizenId");

-- CreateIndex
CREATE INDEX "License_citizenId_idx" ON "License"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");

-- CreateIndex
CREATE INDEX "Vehicle_isStolen_idx" ON "Vehicle"("isStolen");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_serialNumber_key" ON "Weapon"("serialNumber");

-- CreateIndex
CREATE INDEX "Weapon_ownerId_idx" ON "Weapon"("ownerId");

-- CreateIndex
CREATE INDEX "Property_citizenId_idx" ON "Property"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "PenalCategory_name_key" ON "PenalCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Offense_code_key" ON "Offense"("code");

-- CreateIndex
CREATE INDEX "Offense_categoryId_idx" ON "Offense"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_number_key" ON "Report"("number");

-- CreateIndex
CREATE INDEX "Report_status_type_idx" ON "Report"("status", "type");

-- CreateIndex
CREATE INDEX "Report_departmentId_idx" ON "Report"("departmentId");

-- CreateIndex
CREATE INDEX "Report_authorId_idx" ON "Report"("authorId");

-- CreateIndex
CREATE INDEX "ReportInvolvement_reportId_idx" ON "ReportInvolvement"("reportId");

-- CreateIndex
CREATE INDEX "ReportInvolvement_citizenId_idx" ON "ReportInvolvement"("citizenId");

-- CreateIndex
CREATE INDEX "ReportOfficer_userId_idx" ON "ReportOfficer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportOfficer_reportId_userId_key" ON "ReportOfficer"("reportId", "userId");

-- CreateIndex
CREATE INDEX "ReportVehicle_reportId_idx" ON "ReportVehicle"("reportId");

-- CreateIndex
CREATE INDEX "ReportVehicle_vehicleId_idx" ON "ReportVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "Evidence_reportId_idx" ON "Evidence"("reportId");

-- CreateIndex
CREATE INDEX "Charge_reportId_idx" ON "Charge"("reportId");

-- CreateIndex
CREATE INDEX "Charge_citizenId_idx" ON "Charge"("citizenId");

-- CreateIndex
CREATE INDEX "Charge_offenseId_idx" ON "Charge"("offenseId");

-- CreateIndex
CREATE INDEX "Warrant_status_idx" ON "Warrant"("status");

-- CreateIndex
CREATE INDEX "Warrant_citizenId_idx" ON "Warrant"("citizenId");

-- CreateIndex
CREATE INDEX "Bolo_isActive_type_idx" ON "Bolo"("isActive", "type");

-- CreateIndex
CREATE INDEX "Bolo_citizenId_idx" ON "Bolo"("citizenId");

-- CreateIndex
CREATE INDEX "Bolo_vehicleId_idx" ON "Bolo"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_citizenId_key" ON "MedicalRecord"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "EmsDetail_reportId_key" ON "EmsDetail"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_number_key" ON "Call"("number");

-- CreateIndex
CREATE INDEX "Call_status_priority_idx" ON "Call"("status", "priority");

-- CreateIndex
CREATE INDEX "CallLog_callId_idx" ON "CallLog"("callId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE INDEX "Unit_isActive_idx" ON "Unit"("isActive");

-- CreateIndex
CREATE INDEX "UnitMember_userId_idx" ON "UnitMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitMember_unitId_userId_key" ON "UnitMember"("unitId", "userId");

-- CreateIndex
CREATE INDEX "CallUnit_unitId_idx" ON "CallUnit"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "CallUnit_callId_unitId_key" ON "CallUnit"("callId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusCode_code_key" ON "StatusCode"("code");

-- CreateIndex
CREATE INDEX "Announcement_departmentId_idx" ON "Announcement"("departmentId");

-- CreateIndex
CREATE INDEX "Certification_departmentId_idx" ON "Certification"("departmentId");

-- CreateIndex
CREATE INDEX "UserCertification_userId_idx" ON "UserCertification"("userId");

-- CreateIndex
CREATE INDEX "UserCertification_certificationId_idx" ON "UserCertification"("certificationId");

-- CreateIndex
CREATE INDEX "Discipline_userId_idx" ON "Discipline"("userId");

-- CreateIndex
CREATE INDEX "Shift_userId_idx" ON "Shift"("userId");

-- CreateIndex
CREATE INDEX "Shift_departmentId_idx" ON "Shift"("departmentId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenNote" ADD CONSTRAINT "CitizenNote_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenNote" ADD CONSTRAINT "CitizenNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offense" ADD CONSTRAINT "Offense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PenalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportInvolvement" ADD CONSTRAINT "ReportInvolvement_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportInvolvement" ADD CONSTRAINT "ReportInvolvement_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportOfficer" ADD CONSTRAINT "ReportOfficer_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportOfficer" ADD CONSTRAINT "ReportOfficer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVehicle" ADD CONSTRAINT "ReportVehicle_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportVehicle" ADD CONSTRAINT "ReportVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_offenseId_fkey" FOREIGN KEY ("offenseId") REFERENCES "Offense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bolo" ADD CONSTRAINT "Bolo_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bolo" ADD CONSTRAINT "Bolo_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bolo" ADD CONSTRAINT "Bolo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsDetail" ADD CONSTRAINT "EmsDetail_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitMember" ADD CONSTRAINT "UnitMember_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitMember" ADD CONSTRAINT "UnitMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallUnit" ADD CONSTRAINT "CallUnit_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallUnit" ADD CONSTRAINT "CallUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCertification" ADD CONSTRAINT "UserCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCertification" ADD CONSTRAINT "UserCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCertification" ADD CONSTRAINT "UserCertification_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
