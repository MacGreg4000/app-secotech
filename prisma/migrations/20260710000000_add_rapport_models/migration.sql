-- AlterTable
ALTER TABLE `Document` ADD COLUMN `rapportId` VARCHAR(191) NULL,
    ADD COLUMN `tagKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `rapport` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `personnes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rapport_chantierId_idx`(`chantierId`),
    INDEX `rapport_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rapport_note` (
    `id` VARCHAR(191) NOT NULL,
    `rapportId` VARCHAR(191) NOT NULL,
    `contenu` TEXT NOT NULL,
    `tags` JSON NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,

    INDEX `rapport_note_rapportId_idx`(`rapportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rapport_photo` (
    `id` VARCHAR(191) NOT NULL,
    `rapportId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `annotation` TEXT NULL,
    `tags` JSON NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `documentId` INTEGER NULL,

    INDEX `rapport_photo_rapportId_idx`(`rapportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Document_rapportId_idx` ON `Document`(`rapportId`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_rapportId_fkey` FOREIGN KEY (`rapportId`) REFERENCES `rapport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapport` ADD CONSTRAINT `rapport_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapport` ADD CONSTRAINT `rapport_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapport_note` ADD CONSTRAINT `rapport_note_rapportId_fkey` FOREIGN KEY (`rapportId`) REFERENCES `rapport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rapport_photo` ADD CONSTRAINT `rapport_photo_rapportId_fkey` FOREIGN KEY (`rapportId`) REFERENCES `rapport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

