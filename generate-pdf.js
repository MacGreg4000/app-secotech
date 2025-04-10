// Script pour générer un PDF à partir du fichier Markdown
const fs = require('fs');
const path = require('path');
const markdownpdf = require('markdown-pdf');
const moment = require('moment');

// Configuration des options PDF
const pdfOptions = {
  cssPath: path.join(__dirname, 'pdf-style.css'),
  paperFormat: 'A4',
  paperBorder: '20mm',
  runningsPath: path.join(__dirname, 'pdf-headers.js'),
  remarkable: {
    html: true,
    breaks: true,
    plugins: ['remarkable-meta'],
    syntax: ['footnote', 'sup', 'sub']
  }
};

console.log('Génération du PDF en cours...');

// Chemin des fichiers source et destination
const sourceMd = path.join(__dirname, 'Manuel_Utilisateur_SecoTech.md');
const outputPdf = path.join(__dirname, `Manuel_Utilisateur_SecoTech_${moment().format('YYYYMMDD')}.pdf`);

// Création du PDF
markdownpdf(pdfOptions)
  .from(sourceMd)
  .to(outputPdf, function () {
    console.log(`PDF généré avec succès : ${outputPdf}`);
  }); 