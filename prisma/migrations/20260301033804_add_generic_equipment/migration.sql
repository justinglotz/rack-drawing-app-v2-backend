-- AlterTable
ALTER TABLE "PullsheetItem" ADD COLUMN     "genericEquipmentId" INTEGER;

-- CreateTable
CREATE TABLE "GenericEquipment" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255),
    "category" VARCHAR(100) NOT NULL,
    "rackUnits" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenericEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PullsheetItem_genericEquipmentId_idx" ON "PullsheetItem"("genericEquipmentId");

-- AddForeignKey
ALTER TABLE "PullsheetItem" ADD CONSTRAINT "PullsheetItem_genericEquipmentId_fkey" FOREIGN KEY ("genericEquipmentId") REFERENCES "GenericEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
