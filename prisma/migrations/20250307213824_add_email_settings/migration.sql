-- AlterTable
ALTER TABLE `companysettings` ADD COLUMN `emailFrom` VARCHAR(191) NULL,
    ADD COLUMN `emailFromName` VARCHAR(191) NULL,
    ADD COLUMN `emailHost` VARCHAR(191) NULL,
    ADD COLUMN `emailPassword` VARCHAR(191) NULL,
    ADD COLUMN `emailPort` VARCHAR(191) NULL,
    ADD COLUMN `emailSecure` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `emailUser` VARCHAR(191) NULL;
