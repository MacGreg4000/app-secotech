-- CreateTable
CREATE TABLE `depense` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montant` DOUBLE NOT NULL,
    `description` TEXT NOT NULL,
    `categorie` VARCHAR(191) NOT NULL,
    `fournisseur` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `justificatif` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `depense_chantierId_idx`(`chantierId`),
    INDEX `depense_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `depense` ADD CONSTRAINT `depense_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `depense` ADD CONSTRAINT `depense_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
