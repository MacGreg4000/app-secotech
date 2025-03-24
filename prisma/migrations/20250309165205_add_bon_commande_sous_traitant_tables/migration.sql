-- CreateTable
CREATE TABLE `bon_commande_sous_traitant` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('EN_ATTENTE', 'VALIDE', 'REFUSE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `bon_commande_sous_traitant_chantierId_idx`(`chantierId`),
    INDEX `bon_commande_sous_traitant_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_bon_commande_sous_traitant` (
    `id` VARCHAR(191) NOT NULL,
    `bonCommandeSousTraitantId` VARCHAR(191) NOT NULL,
    `ligneCommandeId` INTEGER NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_bon_commande_sous_traitant_bonCommandeSousTraitantId_idx`(`bonCommandeSousTraitantId`),
    INDEX `ligne_bon_commande_sous_traitant_ligneCommandeId_idx`(`ligneCommandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bon_commande_sous_traitant` ADD CONSTRAINT `bon_commande_sous_traitant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_commande_sous_traitant` ADD CONSTRAINT `bon_commande_sous_traitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_bon_commande_sous_traitant` ADD CONSTRAINT `ligne_bon_commande_sous_traitant_bonCommandeSousTraitantId_fkey` FOREIGN KEY (`bonCommandeSousTraitantId`) REFERENCES `bon_commande_sous_traitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_bon_commande_sous_traitant` ADD CONSTRAINT `ligne_bon_commande_sous_traitant_ligneCommandeId_fkey` FOREIGN KEY (`ligneCommandeId`) REFERENCES `lignecommande`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; 