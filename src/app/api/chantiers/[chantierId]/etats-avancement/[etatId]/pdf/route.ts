import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

// Fonction pour formater les nombres
function formatNumber(num: number): string {
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Fonction pour générer le HTML
function generateHTML(data: any, settings: any) {
  // Préparer le logo
  let logoHtml = '';
  if (settings && settings.logo) {
    // Vérifier si le logo existe dans le dossier public/images
    const logoPath = path.join(process.cwd(), 'public', settings.logo);
    if (fs.existsSync(logoPath)) {
      try {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoHtml = `<img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo">`;
      } catch (error) {
        console.error('Erreur lors du chargement du logo:', error);
        // Utiliser un logo par défaut ou ne pas afficher de logo
        logoHtml = '<div class="logo-placeholder">Logo non disponible</div>';
      }
    } else {
      // Chercher dans public/images/ pour les anciens fichiers
      const fallbackLogoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
      if (fs.existsSync(fallbackLogoPath)) {
        try {
          const logoBase64 = fs.readFileSync(fallbackLogoPath).toString('base64');
          logoHtml = `<img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo">`;
        } catch (error) {
          console.error('Erreur lors du chargement du logo par défaut:', error);
          logoHtml = '<div class="logo-placeholder">Logo non disponible</div>';
        }
      } else {
        logoHtml = '<div class="logo-placeholder">Logo non disponible</div>';
      }
    }
  } else {
    logoHtml = '<div class="logo-placeholder">Logo non disponible</div>';
  }

  // Extraire la période de travaux des commentaires
  let periodeDeTravaux = '';
  let commentairesFiltres = '';
  if (data.commentaires) {
    const lines = data.commentaires.split('\n');
    const periodeLine = lines.find((line: string) => line.startsWith('Période de travaux:'));
    if (periodeLine) {
      periodeDeTravaux = periodeLine.replace('Période de travaux:', '').trim();
      commentairesFiltres = lines.filter((ligne: string) => !ligne.startsWith('Période de travaux:')).join('\n').trim();
    } else {
      commentairesFiltres = data.commentaires;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          position: relative;
          min-height: 100vh;
          counter-reset: pages var(--page-count) page var(--page-number);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
        }
        .logo, .logo-placeholder {
          width: 150px;
          height: auto;
          object-fit: contain;
        }
        .logo-placeholder {
          border: 1px dashed #ccc;
          padding: 10px;
          text-align: center;
          color: #888;
          font-size: 12px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          text-align: center;
          flex: 1;
          margin: 0 20px;
          color: #2c3e50;
        }
        .period {
          font-size: 16px;
          font-weight: normal;
          color: #666;
          display: block;
          margin-top: 5px;
        }
        .subtitle {
          margin-bottom: 20px;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9px;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
          overflow-wrap: break-word;
          word-wrap: break-word;
          hyphens: auto;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
          white-space: nowrap;
        }
        td {
          vertical-align: top;
        }
        td.description {
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
        }
        .number {
          text-align: right;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin: 20px 0;
          padding: 10px;
          background-color: #f4f4f4;
          color: #2c3e50;
        }
        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
          page-break-before: always;
          font-size: 11px;
        }
        .summary-container {
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
        }
        .summary-row {
          display: grid;
          grid-template-columns: 1fr repeat(3, 120px);
          gap: 0;
          margin: 5px 0;
          align-items: center;
          border-bottom: 1px solid #eee;
        }
        .summary-row > * {
          padding: 8px;
          border-right: 1px solid #ddd;
        }
        .summary-row > *:last-child {
          border-right: none;
        }
        .summary-label {
          font-weight: bold;
          color: #2c3e50;
        }
        .summary-header {
          display: grid;
          grid-template-columns: 1fr repeat(3, 120px);
          gap: 0;
          margin-bottom: 10px;
          font-weight: bold;
          color: #2c3e50;
          border-bottom: 2px solid #ddd;
        }
        .summary-header > * {
          padding: 8px;
          text-align: center;
          border-right: 1px solid #ddd;
        }
        .summary-header > *:first-child {
          text-align: left;
        }
        .summary-header > *:last-child {
          border-right: none;
        }
        .summary-amount {
          text-align: right;
          font-family: Arial, sans-serif;
        }
        .total-general {
          margin-top: 10px;
          font-size: 13px;
          font-weight: bold;
          border-bottom: none !important;
          background-color: #f4f4f4;
        }
        .total-general .summary-amount.current {
          color: #2563eb;
          font-size: 14px;
        }
        .content {
          margin-bottom: 50px;
        }
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="header">
          ${logoHtml}
          <div class="title">
            ÉTAT D'AVANCEMENT
            ${periodeDeTravaux ? `<span class="period">Période : ${periodeDeTravaux}</span>` : ''}
          </div>
        </div>

        <div class="subtitle">
          <p>Chantier: ${data.chantier.nomChantier}</p>
          <p>État n°${data.numero} - ${new Date(data.date).toLocaleDateString('fr-FR')}${data.mois ? ` - ${data.mois}` : ''}</p>
          ${commentairesFiltres ? `<p>Commentaires: ${commentairesFiltres}</p>` : ''}
        </div>

        <table>
          <colgroup>
            <col style="width: 8%">
            <col style="width: 25%">
            <col style="width: 7%">
            <col style="width: 5%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
            <col style="width: 7%">
          </colgroup>
          <thead>
            <tr>
              <th>Art.</th>
              <th>Description</th>
              <th>Type</th>
              <th>Un.</th>
              <th>P.U.</th>
              <th>Qté</th>
              <th>Total</th>
              <th>Qté P.</th>
              <th>Qté A.</th>
              <th>Qté T.</th>
              <th>Mt. P.</th>
              <th>Mt. A.</th>
              <th>Mt. T.</th>
            </tr>
          </thead>
          <tbody>
            ${data.lignes.map((ligne: any) => `
              <tr>
                <td>${ligne.article}</td>
                <td class="description">${ligne.description}</td>
                <td>${ligne.type}</td>
                <td>${ligne.unite}</td>
                <td class="number">${formatNumber(ligne.prixUnitaire)}</td>
                <td class="number">${formatNumber(ligne.quantite)}</td>
                <td class="number">${formatNumber(ligne.prixUnitaire * ligne.quantite)}</td>
                <td class="number">${formatNumber(ligne.quantitePrecedente)}</td>
                <td class="number">${formatNumber(ligne.quantiteActuelle)}</td>
                <td class="number">${formatNumber(ligne.quantiteTotale)}</td>
                <td class="number">${formatNumber(ligne.montantPrecedent)}</td>
                <td class="number">${formatNumber(ligne.montantActuel)}</td>
                <td class="number">${formatNumber(ligne.montantTotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${data.avenants.length > 0 ? `
          <div style="page-break-before: auto;">
            <h2 class="section-title">AVENANTS</h2>
            <table>
              <colgroup>
                <col style="width: 8%">
                <col style="width: 25%">
                <col style="width: 7%">
                <col style="width: 5%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
                <col style="width: 7%">
              </colgroup>
              <thead>
                <tr>
                  <th>Art.</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Un.</th>
                  <th>P.U.</th>
                  <th>Qté</th>
                  <th>Total</th>
                  <th>Qté P.</th>
                  <th>Qté A.</th>
                  <th>Qté T.</th>
                  <th>Mt. P.</th>
                  <th>Mt. A.</th>
                  <th>Mt. T.</th>
                </tr>
              </thead>
              <tbody>
                ${data.avenants.map((avenant: any) => `
                  <tr>
                    <td>${avenant.article}</td>
                    <td class="description">${avenant.description}</td>
                    <td>${avenant.type}</td>
                    <td>${avenant.unite}</td>
                    <td class="number">${formatNumber(avenant.prixUnitaire)}</td>
                    <td class="number">${formatNumber(avenant.quantite)}</td>
                    <td class="number">${formatNumber(avenant.prixUnitaire * avenant.quantite)}</td>
                    <td class="number">${formatNumber(avenant.quantitePrecedente)}</td>
                    <td class="number">${formatNumber(avenant.quantiteActuelle)}</td>
                    <td class="number">${formatNumber(avenant.quantiteTotale)}</td>
                    <td class="number">${formatNumber(avenant.montantPrecedent)}</td>
                    <td class="number">${formatNumber(avenant.montantActuel)}</td>
                    <td class="number">${formatNumber(avenant.montantTotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="summary">
          <h2 class="section-title">RÉCAPITULATIF</h2>
          
          <div class="summary-container">
            <div class="summary-header">
              <span></span>
              <span>Montant précédent</span>
              <span>Montant actuel</span>
              <span>Montant total</span>
            </div>

            <div class="summary-row">
              <span class="summary-label">Total commande initiale</span>
              <span class="summary-amount">${formatNumber(data.totalCommandeInitiale.precedent)} €</span>
              <span class="summary-amount">${formatNumber(data.totalCommandeInitiale.actuel)} €</span>
              <span class="summary-amount">${formatNumber(data.totalCommandeInitiale.total)} €</span>
            </div>

            <div class="summary-row">
              <span class="summary-label">Total avenants</span>
              <span class="summary-amount">${formatNumber(data.totalAvenants.precedent)} €</span>
              <span class="summary-amount">${formatNumber(data.totalAvenants.actuel)} €</span>
              <span class="summary-amount">${formatNumber(data.totalAvenants.total)} €</span>
            </div>

            <div class="summary-row total-general">
              <span class="summary-label">TOTAL GÉNÉRAL</span>
              <span class="summary-amount">${formatNumber(data.totalGeneral.precedent)} €</span>
              <span class="summary-amount current">${formatNumber(data.totalGeneral.actuel)} €</span>
              <span class="summary-amount">${formatNumber(data.totalGeneral.total)} €</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  try {
    // Ajouter des logs pour le debug
    console.log(`Génération de PDF pour le chantier ${params.chantierId}, état ${params.etatId}`);
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Session non trouvée');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'état d'avancement
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId,
        numero: parseInt(params.etatId)
      },
      include: {
        lignes: true,
        avenants: true,
      }
    })

    if (!etatAvancement) {
      console.log(`État d'avancement non trouvé pour le chantier ${params.chantierId}, état ${params.etatId}`);
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }

    console.log(`État d'avancement trouvé: ${etatAvancement.id}`);

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findFirst({
      where: {
        chantierId: params.chantierId
      }
    });

    if (!chantier) {
      console.log(`Chantier non trouvé: ${params.chantierId}`);
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      console.warn('Paramètres de l\'entreprise non trouvés, la génération du PDF continuera sans ces informations');
    }

    // Continuer avec la génération du PDF même si les paramètres de l'entreprise ne sont pas trouvés
    const totalHT = etatAvancement.lignes.reduce(
      (acc, ligne) => acc + (ligne.prixUnitaire * ligne.quantite),
      0
    )
    // Utiliser un taux de TVA fixe de 21% car il n'existe pas dans le modèle
    const tauxTVA = 0.21
    const totalTVA = totalHT * tauxTVA
    const totalTTC = totalHT + totalTVA

    // Calcul des totaux pour les états d'avancement
    const totalCommandeInitiale = {
      precedent: etatAvancement.lignes.reduce((sum, ligne) => sum + ligne.montantPrecedent, 0),
      actuel: etatAvancement.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0),
      total: etatAvancement.lignes.reduce((sum, ligne) => sum + ligne.montantTotal, 0),
    }

    const totalAvenants = {
      precedent: etatAvancement.avenants.reduce((sum, avenant) => sum + avenant.montantPrecedent, 0),
      actuel: etatAvancement.avenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0),
      total: etatAvancement.avenants.reduce((sum, avenant) => sum + avenant.montantTotal, 0),
    }

    const totalGeneral = {
      precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
      actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
      total: totalCommandeInitiale.total + totalAvenants.total,
    }

    // Générer le HTML
    const html = generateHTML({
      ...etatAvancement,
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral,
      totalHT,
      totalTVA,
      totalTTC,
      tauxTVA,
      chantier,
    }, settings)

    console.log('HTML généré avec succès, lancement de Puppeteer...');

    // Lancer Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(html)

    console.log('Page chargée dans Puppeteer, génération du PDF...');

    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      displayHeaderFooter: true,
      headerTemplate: ' ',
      footerTemplate: `
        <div style="font-size: 10px; color: #666; padding: 10px; border-top: 1px solid #eee; background-color: white; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>${settings?.name || 'Entreprise'} - ${settings?.address || 'Adresse non disponible'}</span>
          <span style="margin-right: 20px;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
    })

    await browser.close()
    console.log('PDF généré avec succès');

    // Créer le dossier des documents s'il n'existe pas
    const documentsDir = path.join(process.cwd(), 'public', 'chantiers', params.chantierId, 'documents')
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true })
      console.log(`Dossier créé: ${documentsDir}`);
    }

    const fileName = `etat-avancement-${params.etatId}-${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(documentsDir, fileName)

    // Sauvegarder le PDF
    await fs.promises.writeFile(filePath, pdfBuffer)
    console.log(`PDF sauvegardé: ${filePath}`);

    // Créer l'entrée dans la base de données
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (user) {
        await prisma.document.create({
          data: {
            nom: `État d'avancement n°${params.etatId}`,
            type: 'ETAT_AVANCEMENT',
            url: `/chantiers/${params.chantierId}/documents/${fileName}`,
            taille: pdfBuffer.length,
            mimeType: 'application/pdf',
            updatedAt: new Date(),
            chantier: {
              connect: {
                chantierId: params.chantierId
              }
            },
            User: {
              connect: {
                id: user.id
              }
            }
          }
        })
        console.log('Document enregistré dans la base de données');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du document dans la base de données:', error);
      // Continuer même si l'enregistrement échoue
    }

    console.log('Retour du PDF au client');
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF', details: error },
      { status: 500 }
    )
  }
} 