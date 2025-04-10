# Génération du Manuel Utilisateur SecoTech en PDF

Ce dossier contient tous les fichiers nécessaires pour générer le manuel utilisateur de l'application SecoTech au format PDF.

## Contenu du dossier

- `Manuel_Utilisateur_SecoTech.md` : Le contenu du manuel au format Markdown
- `generate-pdf.js` : Script Node.js pour convertir le Markdown en PDF
- `pdf-style.css` : Styles CSS pour la mise en page du PDF
- `pdf-headers.js` : Configuration des en-têtes et pieds de page
- `package.json` : Configuration des dépendances

## Prérequis

Pour générer le PDF, vous avez besoin de:
- Node.js (version 14 ou supérieure)
- NPM (généralement inclus avec Node.js)

## Installation des dépendances

Avant de générer le PDF, installez les dépendances nécessaires:

```bash
npm install
```

Cette commande installera:
- markdown-pdf: Pour convertir le Markdown en PDF
- moment: Pour formater les dates
- remarkable: Pour le rendu Markdown avancé
- remarkable-meta: Pour les métadonnées

## Génération du PDF

Pour générer le PDF, exécutez la commande:

```bash
npm run generate-pdf
```

ou directement:

```bash
node generate-pdf.js
```

Le PDF sera généré sous le nom `Manuel_Utilisateur_SecoTech_YYYYMMDD.pdf` où YYYYMMDD correspond à la date du jour.

## Personnalisation

### Mise à jour du contenu

Pour mettre à jour le contenu du manuel, modifiez le fichier `Manuel_Utilisateur_SecoTech.md`.

### Modification du style

Pour modifier l'apparence du PDF:
- Modifiez `pdf-style.css` pour changer les styles (polices, couleurs, etc.)
- Modifiez `pdf-headers.js` pour changer les en-têtes et pieds de page

## Notes

- Les images référencées dans le Markdown doivent être présentes dans les chemins indiqués.
- Pour une meilleure rendu, des sauts de page ont été insérés à des endroits stratégiques via `<div style="page-break-after: always;"></div>`.
- La première page est automatiquement formatée comme une page de couverture.

## Problèmes connus

- Si le CSS utilise des polices externes, assurez-vous qu'elles sont accessibles lors de la génération.
- Certaines fonctionnalités CSS avancées peuvent ne pas être prises en charge par le moteur de rendu. 