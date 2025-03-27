/*
  Warnings:

  - You are about to drop the column `etatAvancementId` on the `soustraitant_etat_avancement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[chantierId,soustraitantId,numero]` on the table `soustraitant_etat_avancement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chantierId` to the `soustraitant_etat_avancement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `soustraitant_etat_avancement` DROP FOREIGN KEY `soustraitant_etat_avancement_etatAvancementId_fkey`;

-- DropIndex
DROP INDEX `soustraitant_etat_avancement_etatAvancementId_idx` ON `soustraitant_etat_avancement`;

-- DropIndex
DROP INDEX `soustraitant_etat_avancement_etatAvancementId_soustraitantId_key` ON `soustraitant_etat_avancement`;

-- AlterTable
ALTER TABLE `soustraitant_etat_avancement` DROP COLUMN `etatAvancementId`,
    ADD COLUMN `chantierId` VARCHAR(191) NOT NULL,
    ADD COLUMN `createdBy` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `soustraitant_etat_avancement_chantierId_idx` ON `soustraitant_etat_avancement`(`chantierId`);

-- CreateIndex
CREATE UNIQUE INDEX `soustraitant_etat_avancement_chantierId_soustraitantId_numer_key` ON `soustraitant_etat_avancement`(`chantierId`, `soustraitantId`, `numero`);

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;
