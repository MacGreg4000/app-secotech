# Rentabilité chantier — calcul automatique du coût matière

Statut : **plan validé, non implémenté**. Document de référence entre sessions/postes.

## Problème de départ

On a discuté de "faire comme les concurrents" (une IA qui surveille en continu la
rentabilité de chaque chantier). En creusant, le vrai blocage n'est pas l'absence
d'outil d'analyse : c'est que **personne ne prend le temps d'encoder les
marchandises** (carrelage, colle, joint, silicone, transport) chantier par
chantier. Le formulaire de dépense existe déjà (`DepenseForm.tsx` /
`components/depense/`) mais c'est 6 champs à taper à la main par ligne — en
pratique, ça ne se fait pas.

Décision : plutôt que de réduire la friction de saisie (photo + OCR, etc.),
**calculer le coût matière automatiquement** à partir de ce qui est déjà encodé,
puisque presque tous les chantiers sont sous-traités (la main d'œuvre est déjà
captée via les états d'avancement sous-traitant).

## Ce qui existe déjà (briques réutilisables)

- **`Marche` / `LigneMarche` / `Etat` / `LigneEtat`** = côté **client** (devis
  signé + quantités facturées cumulées à ce jour). `LigneMarche` a
  `article`, `descriptif`, `unite`, `quantite`, `prixUnitaire` (prix de VENTE).
  **C'est la source des m² à utiliser pour ce calcul.**
- **`EtatAvancement` / `LigneEtatAvancement`** = côté **sous-traitant**
  (paiement main d'œuvre). Ne PAS l'utiliser pour le calcul matière — seulement
  pour le coût main d'œuvre (déjà pris en compte ailleurs).
- **`CardFinancialSummary.tsx`** : calcule déjà `totalRevenue`, `totalExpenses`
  (`manualExpenses` + `soustraitantExpenses`), `netResult`, `margin` — mais à la
  demande, un chantier à la fois, jamais agrégé ni historisé. C'est le point
  d'intégration naturel pour ajouter le coût matière calculé.
- **Skill `decompte-sous-traitant`** : catégorise déjà des quantités en
  *carrelage sol / plinthe / mur / étanchéité* à partir de devis PDF — même
  logique de catégorisation à reproduire ici, mais sur les lignes en base
  plutôt que sur du PDF.
- **Agent MCP** (`src/lib/agent/tools/`) : 20 outils de lecture/écriture déjà
  exposés (chantiers, clients, commandes, notes, états d'avancement). Bonne
  base pour y ajouter un outil "rentabilité chantier" plus tard.
- **RAGBot** (`src/components/chat/RAGBot.tsx` + Ollama) : chatbot déjà présent
  dans l'app, pourrait à terme commenter les chiffres de rentabilité.

## Décisions prises avec Grégory

1. **Source des quantités** : `LigneMarche` / `LigneEtat` (client), pas les
   états d'avancement sous-traitant.
2. **Prix carrelage** : variable et saisi **ligne par ligne** (plusieurs
   carrelages possibles sur un même chantier — salle de bain vs séjour, etc.).
3. **Colle / joint / silicone** : quasi fixes → un **barème de ratios
   configurable**, valeurs provisoires au départ, ajustables via une page
   d'admin.
4. **Chutes de carrelage** : prévoir un **% de chute** dans le calcul (on
   achète plus de carrelage que le m² net posé).
5. **Catégorisation des lignes de marché** (sol / mur / plinthe / étanchéité) :
   **détection automatique par mots-clés** dans le `descriptif`, avec
   correction manuelle possible ligne par ligne en cas d'erreur.

## Modèle de données prévu

### Nouvelle table `BaremeMateriau`
Une ligne par catégorie (`SOL`, `MUR`, `PLINTHE`, `ETANCHEITE`) :
- `ratioColleKgM2` + `prixColleKg`
- `ratioJointKgM2` + `prixJointKg`
- `ratioSiliconeMl` + `prixSiliconeMl` (surtout pertinent pour PLINTHE/ETANCHEITE)
- `pourcentageChute` (% de carrelage acheté en plus pour compenser les coupes)

Éditable via une page d'admin dédiée.

### Nouveaux champs sur `LigneMarche`
- `categorieMateriau` (nullable : `SOL` | `MUR` | `PLINTHE` | `ETANCHEITE` |
  `null`) — auto-détecté à la création/import du devis à partir du
  `descriptif`, corrigible à la main.
- `coutMatiereM2` (nullable, Float) — prix d'achat du carrelage pour cette
  ligne. **Seul champ vraiment manuel**, ligne par ligne.

## Moteur de calcul

Pour chaque chantier, pour chaque `LigneMarche` catégorisée :
1. `quantite` = dernière quantité cumulée facturée au client à ce jour
   (`LigneEtat.quantite` le plus récent pour cette ligne).
2. `coutCarrelage = quantite × coutMatiereM2 × (1 + pourcentageChute / 100)`
3. `coutColle = quantite × ratioColleKgM2 × prixColleKg`
4. `coutJoint = quantite × ratioJointKgM2 × prixJointKg`
5. `coutSilicone = quantite × ratioSiliconeMl × prixSiliconeMl`
6. Total ligne = somme des 4 ; total chantier = somme des lignes.

## Intégration

- Nouvelle ligne "Coût matière (estimé)" dans `CardFinancialSummary.tsx`, à
  côté de `soustraitantExpenses` et `manualExpenses`, dans le calcul de
  `totalExpenses` / `netResult` / `margin`.
- Deux nouvelles surfaces UI :
  - Page admin pour éditer le `BaremeMateriau` (4 catégories, quelques champs
    chacune).
  - Un endroit pour saisir `categorieMateriau` / `coutMatiereM2` sur les
    lignes de marché — probablement dans l'écran d'édition du devis/marché
    existant (à localiser précisément au moment de l'implémentation).

## Pistes pour aller plus loin (non prioritaires, à explorer après la V1)

- **Auto-calibration du barème** : comparer coût réel (si des dépenses matière
  finissent par être encodées occasionnellement) vs coût estimé, pour affiner
  automatiquement `pourcentageChute` et les ratios dans le temps au lieu de
  rester sur des valeurs figées.
- **Génération de bon de commande matière** : dès qu'un devis est signé et
  qu'un carrelage est choisi, proposer automatiquement la commande fournisseur
  (m² marché × (1+chute)) — boucle la saisie en amont, avant même la pose.
- **Dashboard rentabilité agrégé multi-chantiers** avec ce coût matière
  intégré, triable par marge, avec seuils d'alerte.
- **Historique dans le temps** des marges par chantier / sous-traitant / type
  de pose, pour repérer les dérives récurrentes (tel poseur coûte
  systématiquement plus cher que prévu, tel type de chantier est
  structurellement moins rentable).
- **Écart marché vs état d'avancement** : alerte si le client est facturé plus
  vite que ce que le chantier avance réellement (signal de dérapage).
- **Outil agent "rentabilité chantier"** : ajouter un outil au serveur MCP
  existant (`src/lib/agent/tools/`) pour interroger la marge en langage
  naturel, et à terme un résumé mensuel proactif via le RAGBot.

## Prochaine étape

Migration Prisma (`BaremeMateriau` + champs sur `LigneMarche`) + les deux
écrans UI + le moteur de calcul + l'intégration dans `CardFinancialSummary`.
C'est un morceau conséquent (migration DB + plusieurs écrans) — à traiter dans
une session dédiée plutôt qu'en fin de session.
