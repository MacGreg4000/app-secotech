/*
  Warnings:

  - Added the required column `emprunteur` to the `Pret` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pret` ADD COLUMN `emprunteur` VARCHAR(191) NOT NULL,
    MODIFY `commentaire` VARCHAR(191) NULL;
