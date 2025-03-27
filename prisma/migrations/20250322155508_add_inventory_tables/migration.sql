-- CreateTable
CREATE TABLE `rack` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `lignes` INTEGER NOT NULL,
    `colonnes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emplacement` (
    `id` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `ligne` INTEGER NOT NULL,
    `colonne` INTEGER NOT NULL,
    `codeQR` VARCHAR(191) NOT NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'libre',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emplacement_codeQR_key`(`codeQR`),
    INDEX `emplacement_rackId_idx`(`rackId`),
    UNIQUE INDEX `emplacement_rackId_ligne_colonne_key`(`rackId`, `ligne`, `colonne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiau` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantite` INTEGER NOT NULL DEFAULT 1,
    `codeQR` VARCHAR(191) NULL,
    `emplacementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materiau_codeQR_key`(`codeQR`),
    INDEX `materiau_emplacementId_idx`(`emplacementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emplacement` ADD CONSTRAINT `emplacement_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `rack`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiau` ADD CONSTRAINT `materiau_emplacementId_fkey` FOREIGN KEY (`emplacementId`) REFERENCES `emplacement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
