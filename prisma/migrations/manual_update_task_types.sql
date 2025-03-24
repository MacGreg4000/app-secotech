UPDATE AdminTask 
SET taskType = CASE 
  WHEN title LIKE '%déclaration%' THEN 'declaration-chantier'
  WHEN title LIKE '%cautionnement%' THEN 'cautionnement'
  WHEN title LIKE '%sous-traitance%' THEN 'sous-traitance'
  WHEN title LIKE '%fiche technique%' THEN 'fiche-technique'
  ELSE 'default'
END; 