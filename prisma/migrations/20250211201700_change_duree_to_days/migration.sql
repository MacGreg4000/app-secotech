/*
  Warnings:

  - You are about to drop the column `dateDebut` on the `Chantier` table. All the data in the column will be lost.
  - You are about to drop the column `dureeEnMois` on the `Chantier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Chantier` DROP COLUMN `dateDebut`,
    DROP COLUMN `dureeEnMois`,
    ADD COLUMN `dureeEnJours` INTEGER NULL;
