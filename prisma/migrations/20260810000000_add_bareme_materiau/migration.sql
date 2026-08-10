-- AlterTable
ALTER TABLE `lignecommande` ADD COLUMN `categorieMateriau` VARCHAR(191) NULL,
    ADD COLUMN `coutMatiereM2` DOUBLE NULL;

-- CreateTable
CREATE TABLE `bareme_materiau` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categorie` VARCHAR(191) NOT NULL,
    `ratioColleKgM2` DOUBLE NOT NULL DEFAULT 0,
    `prixColleKg` DOUBLE NOT NULL DEFAULT 0,
    `ratioJointKgM2` DOUBLE NOT NULL DEFAULT 0,
    `prixJointKg` DOUBLE NOT NULL DEFAULT 0,
    `ratioSiliconeMl` DOUBLE NOT NULL DEFAULT 0,
    `prixSiliconeMl` DOUBLE NOT NULL DEFAULT 0,
    `pourcentageChute` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bareme_materiau_categorie_key`(`categorie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Amorçage des 4 catégories, valeurs à ZÉRO.
-- Volontaire : tant que le barème n'est pas renseigné, le coût matière estimé
-- reste nul. Mieux vaut un zéro visible qu'une marge faussement plausible
-- calculée sur des ratios inventés.
INSERT INTO `bareme_materiau` (`categorie`, `updatedAt`) VALUES
  ('SOL', NOW(3)),
  ('MUR', NOW(3)),
  ('PLINTHE', NOW(3)),
  ('ETANCHEITE', NOW(3));
