-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `adresse` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chantier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `nomChantier` VARCHAR(191) NOT NULL,
    `dateCommencement` DATETIME(3) NOT NULL,
    `etatChantier` VARCHAR(191) NOT NULL DEFAULT 'En préparation',
    `clientNom` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `clientAdresse` VARCHAR(191) NULL,
    `adresseChantier` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clientId` VARCHAR(191) NULL,

    UNIQUE INDEX `Chantier_chantierId_key`(`chantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Note` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `contenu` TEXT NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Note_chantierId_idx`(`chantierId`),
    INDEX `Note_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tache` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tache_chantierId_id_key`(`chantierId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_chantierId_idx`(`chantierId`),
    INDEX `Document_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Marche` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `dateImport` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montantTotal` DOUBLE NOT NULL,

    UNIQUE INDEX `Marche_chantierId_key`(`chantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneMarche` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `article` INTEGER NOT NULL,
    `descriptif` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `marcheId` INTEGER NOT NULL,

    INDEX `LigneMarche_marcheId_idx`(`marcheId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Etat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Etat_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneEtat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatId` INTEGER NOT NULL,
    `ligneMarcheId` INTEGER NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LigneEtat_etatId_idx`(`etatId`),
    INDEX `LigneEtat_ligneMarcheId_idx`(`ligneMarcheId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Avenant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `marcheId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Avenant_marcheId_fkey`(`marcheId`),
    UNIQUE INDEX `Avenant_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `logo` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminTask` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `completedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdminTask_chantierId_idx`(`chantierId`),
    INDEX `AdminTask_completedBy_idx`(`completedBy`),
    UNIQUE INDEX `AdminTask_chantierId_taskType_key`(`chantierId`, `taskType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Chantier` ADD CONSTRAINT `Chantier_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marche` ADD CONSTRAINT `Marche_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneMarche` ADD CONSTRAINT `LigneMarche_marcheId_fkey` FOREIGN KEY (`marcheId`) REFERENCES `Marche`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Etat` ADD CONSTRAINT `Etat_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneEtat` ADD CONSTRAINT `LigneEtat_etatId_fkey` FOREIGN KEY (`etatId`) REFERENCES `Etat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneEtat` ADD CONSTRAINT `LigneEtat_ligneMarcheId_fkey` FOREIGN KEY (`ligneMarcheId`) REFERENCES `LigneMarche`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avenant` ADD CONSTRAINT `Avenant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avenant` ADD CONSTRAINT `Avenant_marcheId_fkey` FOREIGN KEY (`marcheId`) REFERENCES `Marche`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_completedBy_fkey` FOREIGN KEY (`completedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
