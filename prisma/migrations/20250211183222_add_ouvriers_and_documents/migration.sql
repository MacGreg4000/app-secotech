/*
  Warnings:

  - You are about to drop the column `title` on the `AdminTask` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `AdminTask` DROP COLUMN `title`;

-- CreateTable
CREATE TABLE `SousTraitant` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `adresse` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SousTraitant_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ouvrier` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `dateEntree` DATETIME(3) NOT NULL,
    `poste` VARCHAR(191) NOT NULL,
    `sousTraitantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ouvrier_sousTraitantId_idx`(`sousTraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentOuvrier` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateExpiration` DATETIME(3) NULL,
    `ouvrierId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentOuvrier_ouvrierId_idx`(`ouvrierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ouvrier` ADD CONSTRAINT `Ouvrier_sousTraitantId_fkey` FOREIGN KEY (`sousTraitantId`) REFERENCES `SousTraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentOuvrier` ADD CONSTRAINT `DocumentOuvrier_ouvrierId_fkey` FOREIGN KEY (`ouvrierId`) REFERENCES `Ouvrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
