-- CreateEnum
CREATE TYPE "Side" AS ENUM ('FRONT', 'BACK', 'FRONT_LEFT', 'FRONT_RIGHT', 'BACK_LEFT', 'BACK_RIGHT');

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "flexPullsheetId" VARCHAR(255) NOT NULL,
    "flexPullsheetName" VARCHAR(255),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "rackUnits" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "isRack" BOOLEAN NOT NULL DEFAULT false,
    "isStandardItem" BOOLEAN NOT NULL DEFAULT false,
    "isCustomItem" BOOLEAN NOT NULL DEFAULT false,
    "manufacturer" VARCHAR(255),
    "modelNumber" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacedEquipment" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "rackDrawingId" INTEGER NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "displayNameOverride" VARCHAR(500),
    "rackUnits" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "flexLineId" VARCHAR(255) NOT NULL,
    "flexSection" VARCHAR(255) NOT NULL,
    "isFromPullsheet" BOOLEAN NOT NULL DEFAULT true,
    "side" "Side" NOT NULL,
    "startPosition" INTEGER,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacedEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RackDrawing" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "totalSpaces" INTEGER NOT NULL,
    "isDoubleWide" BOOLEAN NOT NULL DEFAULT false,
    "flexSection" VARCHAR(100) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RackDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_flexPullsheetId_key" ON "Job"("flexPullsheetId");

-- CreateIndex
CREATE INDEX "Equipment_jobId_idx" ON "Equipment"("jobId");

-- CreateIndex
CREATE INDEX "PlacedEquipment_equipmentId_idx" ON "PlacedEquipment"("equipmentId");

-- CreateIndex
CREATE INDEX "PlacedEquipment_flexSection_idx" ON "PlacedEquipment"("flexSection");

-- CreateIndex
CREATE INDEX "RackDrawing_jobId_idx" ON "RackDrawing"("jobId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedEquipment" ADD CONSTRAINT "PlacedEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedEquipment" ADD CONSTRAINT "PlacedEquipment_rackDrawingId_fkey" FOREIGN KEY ("rackDrawingId") REFERENCES "RackDrawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RackDrawing" ADD CONSTRAINT "RackDrawing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
