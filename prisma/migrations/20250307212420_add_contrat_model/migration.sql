-- CreateTable
CREATE TABLE `contrat` (
    `id` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateGeneration` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateSignature` DATETIME(3) NULL,
    `estSigne` BOOLEAN NOT NULL DEFAULT false,
    `token` VARCHAR(191) NULL,

    UNIQUE INDEX `contrat_token_key`(`token`),
    INDEX `contrat_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contrat` ADD CONSTRAINT `contrat_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
