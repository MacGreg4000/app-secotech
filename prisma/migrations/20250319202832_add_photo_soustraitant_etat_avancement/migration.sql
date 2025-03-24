-- CreateTable
CREATE TABLE `photo_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `dateAjout` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_soustraitant_etat_avancement_soustraitantEtatAvancemen_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `photo_soustraitant_etat_avancement` ADD CONSTRAINT `photo_soustraitant_etat_avancement_soustraitantEtatAvanceme_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
