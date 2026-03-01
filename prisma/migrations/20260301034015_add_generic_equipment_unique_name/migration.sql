/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `GenericEquipment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GenericEquipment_name_key" ON "GenericEquipment"("name");
