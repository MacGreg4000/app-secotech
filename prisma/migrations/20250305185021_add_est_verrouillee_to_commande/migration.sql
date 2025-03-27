-- CreateTable
CREATE TABLE `commande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `dateCommande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NOT NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 20,
    `sousTotal` DOUBLE NOT NULL DEFAULT 0,
    `totalOptions` DOUBLE NOT NULL DEFAULT 0,
    `tva` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'BROUILLON',
    `estVerrouillee` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Commande_chantierId_idx`(`chantierId`),
    INDEX `Commande_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lignecommande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeId` INTEGER NOT NULL,
    `ordre` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `estOption` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LigneCommande_commandeId_idx`(`commandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commande` ADD CONSTRAINT `commande_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande` ADD CONSTRAINT `commande_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignecommande` ADD CONSTRAINT `lignecommande_commandeId_fkey` FOREIGN KEY (`commandeId`) REFERENCES `commande`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
