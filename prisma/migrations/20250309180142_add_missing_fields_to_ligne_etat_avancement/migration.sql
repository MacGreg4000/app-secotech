/*
  Warnings:

  - Added the required column `article` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prixUnitaire` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantite` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unite` to the `ligne_etat_avancement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ligne_etat_avancement` ADD COLUMN `article` VARCHAR(191) NOT NULL,
    ADD COLUMN `description` TEXT NOT NULL,
    ADD COLUMN `prixUnitaire` DOUBLE NOT NULL,
    ADD COLUMN `quantite` DOUBLE NOT NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL,
    ADD COLUMN `unite` VARCHAR(191) NOT NULL;
