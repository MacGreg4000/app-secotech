/*
  Warnings:

  - You are about to drop the `bon_commande_sous_traitant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ligne_bon_commande_sous_traitant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `bon_commande_sous_traitant` DROP FOREIGN KEY `bon_commande_sous_traitant_chantierId_fkey`;

-- DropForeignKey
ALTER TABLE `bon_commande_sous_traitant` DROP FOREIGN KEY `bon_commande_sous_traitant_soustraitantId_fkey`;

-- DropForeignKey
ALTER TABLE `ligne_bon_commande_sous_traitant` DROP FOREIGN KEY `ligne_bon_commande_sous_traitant_bonCommandeSousTraitantId_fkey`;

-- DropForeignKey
ALTER TABLE `ligne_bon_commande_sous_traitant` DROP FOREIGN KEY `ligne_bon_commande_sous_traitant_ligneCommandeId_fkey`;

-- AlterTable
ALTER TABLE `soustraitant_etat_avancement` ADD COLUMN `commandeSousTraitantId` INTEGER NULL;

-- DropTable
DROP TABLE `bon_commande_sous_traitant`;

-- DropTable
DROP TABLE `ligne_bon_commande_sous_traitant`;

-- CreateTable
CREATE TABLE `commande_soustraitant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `dateCommande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 20,
    `sousTotal` DOUBLE NOT NULL DEFAULT 0,
    `tva` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'BROUILLON',
    `estVerrouillee` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commande_soustraitant_chantierId_idx`(`chantierId`),
    INDEX `commande_soustraitant_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_commande_soustraitant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeSousTraitantId` INTEGER NOT NULL,
    `ordre` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_commande_soustraitant_commandeSousTraitantId_idx`(`commandeSousTraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `soustraitant_etat_avancement_commandeSousTraitantId_idx` ON `soustraitant_etat_avancement`(`commandeSousTraitantId`);

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_commandeSousTraitantId_fkey` FOREIGN KEY (`commandeSousTraitantId`) REFERENCES `commande_soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande_soustraitant` ADD CONSTRAINT `commande_soustraitant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande_soustraitant` ADD CONSTRAINT `commande_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_commande_soustraitant` ADD CONSTRAINT `ligne_commande_soustraitant_commandeSousTraitantId_fkey` FOREIGN KEY (`commandeSousTraitantId`) REFERENCES `commande_soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
