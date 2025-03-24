-- CreateTable
CREATE TABLE `Machine` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `modele` VARCHAR(191) NOT NULL,
    `numeroSerie` VARCHAR(191) NULL,
    `localisation` VARCHAR(191) NOT NULL,
    `statut` ENUM('DISPONIBLE', 'PRETE', 'EN_PANNE', 'EN_REPARATION', 'MANQUE_CONSOMMABLE') NOT NULL DEFAULT 'DISPONIBLE',
    `dateAchat` DATETIME(3) NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Machine_qrCode_key`(`qrCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pret` (
    `id` VARCHAR(191) NOT NULL,
    `machineId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `datePret` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateRetourPrevue` DATETIME(3) NOT NULL,
    `dateRetourEffective` DATETIME(3) NULL,
    `statut` ENUM('EN_COURS', 'TERMINE') NOT NULL DEFAULT 'EN_COURS',
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Pret_machineId_idx`(`machineId`),
    INDEX `Pret_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pret` ADD CONSTRAINT `Pret_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `Machine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pret` ADD CONSTRAINT `Pret_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
