-- CreateTable
CREATE TABLE `etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaires` TEXT NULL,
    `estFinalise` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `etat_avancement_chantierId_idx`(`chantierId`),
    UNIQUE INDEX `etat_avancement_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `ligneCommandeId` INTEGER NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avenant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `avenant_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaires` TEXT NULL,
    `estFinalise` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `soustraitant_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    INDEX `soustraitant_etat_avancement_soustraitantId_idx`(`soustraitantId`),
    UNIQUE INDEX `soustraitant_etat_avancement_etatAvancementId_soustraitantId_key`(`etatAvancementId`, `soustraitantId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_soustraitant_etat_avancement_soustraitantEtatAvancemen_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avenant_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `avenant_soustraitant_etat_avancement_soustraitantEtatAvancem_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `etat_avancement` ADD CONSTRAINT `etat_avancement_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_etat_avancement` ADD CONSTRAINT `ligne_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avenant_etat_avancement` ADD CONSTRAINT `avenant_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_soustraitant_etat_avancement` ADD CONSTRAINT `ligne_soustraitant_etat_avancement_soustraitantEtatAvanceme_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avenant_soustraitant_etat_avancement` ADD CONSTRAINT `avenant_soustraitant_etat_avancement_soustraitantEtatAvance_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
