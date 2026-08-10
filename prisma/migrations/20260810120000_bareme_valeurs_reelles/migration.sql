-- AlterTable
ALTER TABLE `bareme_materiau` ADD COLUMN `coutFixeM2` DOUBLE NOT NULL DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- Valeurs réelles, issues des fiches techniques Litokol et de la facture
-- V2-26-22823-R01 du 24/06/2026.
--
-- PRIX NETS : la facture affiche un prix brut assorti d'une remise « 50 + 10 »
-- (deux remises en cascade). Le net vaut donc brut x 0,5 x 0,9 = brut x 0,45.
-- Vérifié ligne à ligne (X-Gel : 1,000 EUR/kg brut -> 576,00 EUR pour 1 280 kg,
-- soit 0,45 EUR/kg net).
--   • Colle X-Gel S1        1,000 brut -> 0,45   EUR/kg
--   • Joint X-Color 06      3,150 brut -> 1,4175 EUR/kg  (boite de 3 kg, le
--     conditionnement le plus cher ; le sac de 20 kg revient a 0,945)
--   • SafetyGel            12,600 brut -> 5,67   EUR/kg
--   • Pixel 3D                              6,50 EUR la cartouche de 300 ml
--
-- RATIOS : cas le plus defavorable de chaque fiche technique.
--   • Colle    5 kg/m2   (double encollage, le maximum de la fiche X-Gel S1)
--   • Joint    0,95 kg/m2 formule X-Color (A+B)/(AxB) x C x D x 1,94 appliquee
--     a un carreau 100x100 mm, ep. 8 mm, joint 3 mm = 0,93 kg/m2. C'est le
--     format 10x10 des bordereaux, le plus consommateur. Un 600x600 tombe a
--     0,19 kg/m2 : sur un chantier en grand format, ce poste est SURESTIME.
--   • Etancheite 1,7 kg/m2 (trois couches, maximum de la fiche SafetyGel),
--     porte par coutFixeM2 : 1,7 x 5,67 = 9,64 EUR/m2.
--   • Silicone 0,1 cartouche par metre lineaire (joint 6x5 mm = ~10 m par
--     cartouche de 300 ml) = 0,65 EUR/ml.
--
-- PLINTHES : les quantites sont en metres lineaires, pas en m2. Les ratios y
-- sont donc ramenes a ~1/10 (une plinthe fait environ 10 cm de haut).
--
-- CLIPS ET PROFILES : 2 EUR/m2 sur SOL et MUR (donnee metier fournie).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 5,     `prixColleKg`    = 0.45,
  `ratioJointKgM2` = 0.95,  `prixJointKg`    = 1.4175,
  `ratioSiliconeMl`= 0,     `prixSiliconeMl` = 0,
  `pourcentageChute` = 10,  `coutFixeM2`     = 2,
  `updatedAt` = NOW(3)
WHERE `categorie` = 'SOL';

UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 5,     `prixColleKg`    = 0.45,
  `ratioJointKgM2` = 0.95,  `prixJointKg`    = 1.4175,
  `ratioSiliconeMl`= 0,     `prixSiliconeMl` = 0,
  `pourcentageChute` = 10,  `coutFixeM2`     = 2,
  `updatedAt` = NOW(3)
WHERE `categorie` = 'MUR';

-- Quantites en metres lineaires
UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 0.5,   `prixColleKg`    = 0.45,
  `ratioJointKgM2` = 0.1,   `prixJointKg`    = 1.4175,
  `ratioSiliconeMl`= 0.1,   `prixSiliconeMl` = 6.50,
  `pourcentageChute` = 10,  `coutFixeM2`     = 0,
  `updatedAt` = NOW(3)
WHERE `categorie` = 'PLINTHE';

-- SafetyGel porte par coutFixeM2 (1,7 kg/m2 x 5,67 EUR/kg)
UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 0,     `prixColleKg`    = 0,
  `ratioJointKgM2` = 0,     `prixJointKg`    = 0,
  `ratioSiliconeMl`= 0,     `prixSiliconeMl` = 0,
  `pourcentageChute` = 0,   `coutFixeM2`     = 9.64,
  `updatedAt` = NOW(3)
WHERE `categorie` = 'ETANCHEITE';
