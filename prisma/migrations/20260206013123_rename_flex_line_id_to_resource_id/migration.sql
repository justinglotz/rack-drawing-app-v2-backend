/*
  Warnings:

  - You are about to drop the `Equipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlacedEquipment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Equipment" DROP CONSTRAINT "Equipment_jobId_fkey";

-- DropForeignKey
ALTER TABLE "PlacedEquipment" DROP CONSTRAINT "PlacedEquipment_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "PlacedEquipment" DROP CONSTRAINT "PlacedEquipment_rackDrawingId_fkey";

-- DropTable
DROP TABLE "Equipment";

-- DropTable
DROP TABLE "PlacedEquipment";

-- CreateTable
CREATE TABLE "EquipmentCatalog" (
    "id" SERIAL NOT NULL,
    "flexResourceId" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "rackUnits" INTEGER,
    "isStandardItem" BOOLEAN NOT NULL DEFAULT false,
    "excludeFromRackDrawings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullsheetItem" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "equipmentCatalogId" INTEGER,
    "rackDrawingId" INTEGER,
    "parentId" INTEGER,
    "name" VARCHAR(500) NOT NULL,
    "displayNameOverride" VARCHAR(500),
    "rackUnits" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "flexResourceId" VARCHAR(255) NOT NULL,
    "flexSection" VARCHAR(255) NOT NULL,
    "isFromPullsheet" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(1000),
    "side" "Side",
    "startPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullsheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCatalog_flexResourceId_key" ON "EquipmentCatalog"("flexResourceId");

-- CreateIndex
CREATE INDEX "PullsheetItem_jobId_idx" ON "PullsheetItem"("jobId");

-- CreateIndex
CREATE INDEX "PullsheetItem_equipmentCatalogId_idx" ON "PullsheetItem"("equipmentCatalogId");

-- CreateIndex
CREATE INDEX "PullsheetItem_rackDrawingId_idx" ON "PullsheetItem"("rackDrawingId");

-- CreateIndex
CREATE INDEX "PullsheetItem_flexSection_idx" ON "PullsheetItem"("flexSection");

-- CreateIndex
CREATE INDEX "PullsheetItem_parentId_idx" ON "PullsheetItem"("parentId");

-- AddForeignKey
ALTER TABLE "PullsheetItem" ADD CONSTRAINT "PullsheetItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullsheetItem" ADD CONSTRAINT "PullsheetItem_equipmentCatalogId_fkey" FOREIGN KEY ("equipmentCatalogId") REFERENCES "EquipmentCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullsheetItem" ADD CONSTRAINT "PullsheetItem_rackDrawingId_fkey" FOREIGN KEY ("rackDrawingId") REFERENCES "RackDrawing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullsheetItem" ADD CONSTRAINT "PullsheetItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PullsheetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
