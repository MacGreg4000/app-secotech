/*
  Warnings:

  - You are about to drop the column `siret` on the `companysettings` table. All the data in the column will be lost.
  - Added the required column `iban` to the `companysettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- D'abord, ajoutons la colonne iban qui peut être NULL temporairement
ALTER TABLE `companysettings` ADD COLUMN `iban` VARCHAR(191) NULL;

-- Copier les données de siret vers iban
UPDATE `companysettings` SET `iban` = `siret`;

-- Rendre iban NOT NULL
ALTER TABLE `companysettings` MODIFY COLUMN `iban` VARCHAR(191) NOT NULL;

-- Supprimer l'ancienne colonne siret
ALTER TABLE `companysettings` DROP COLUMN `siret`;
