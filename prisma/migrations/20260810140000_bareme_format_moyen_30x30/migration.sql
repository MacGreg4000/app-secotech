-- Bareme recale sur un format 30x30 en pose simple, representatif du parc
-- (donnee metier). Les valeurs precedentes retenaient le cas le plus
-- defavorable de chaque fiche, ce qui surestimait nettement les deux postes.
--
-- COLLE (fiche X-Gel S1) — consommation par denture :
--   spatule 3,5 mm  1,8 kg/m2
--   spatule 6 mm    2,5 kg/m2
--   spatule 8 mm    3,0 kg/m2   <- retenu, denture standard d'un 30x30
--   spatule 10 mm   3,5 kg/m2
--   double encollage 5,0 kg/m2  <- ancienne base, ecartee (pose simple)
--
-- JOINT (fiche X-Color 06) — formule (A+B)/(AxB) x C x D x 1,94 = kg/m2
--   A = B = 300 mm, C = 9 mm, D = 3 mm
--   (300+300)/(300x300) x 9 x 3 x 1,94 = 0,3492 -> 0,35 kg/m2
--   Pour memoire : 10x10 ep.8 = 0,93 (ancienne base) ; 60x60 ep.10 = 0,19.
--
-- Effet sur SOL et MUR, prix nets inchanges (colle 0,45 EUR/kg,
-- joint 1,4175 EUR/kg) :
--   colle  5,00 -> 3,00 kg/m2 = 2,25 -> 1,35 EUR/m2
--   joint  0,95 -> 0,35 kg/m2 = 1,35 -> 0,50 EUR/m2
--   clips et profiles                          2,00 EUR/m2 (inchange)
--   total consommables : 5,60 -> 3,85 EUR/m2
--
-- Les plinthes se mesurent en metres lineaires (~0,1 m2 par ml) : leurs ratios
-- suivent la meme proportion.

UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 3,
  `ratioJointKgM2` = 0.35,
  `updatedAt` = NOW(3)
WHERE `categorie` IN ('SOL', 'MUR');

UPDATE `bareme_materiau` SET
  `ratioColleKgM2` = 0.3,
  `ratioJointKgM2` = 0.035,
  `updatedAt` = NOW(3)
WHERE `categorie` = 'PLINTHE';
