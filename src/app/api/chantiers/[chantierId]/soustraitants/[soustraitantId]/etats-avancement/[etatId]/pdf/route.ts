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
        .logo {
          width: 150px;
          height: auto;
          object-fit: contain;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          text-align: center;
          flex: 1;
          margin: 0 20px;
          color: #2c3e50;
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
          <img src="data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'logo.png')).toString('base64')}" class="logo" alt="Logo">
          <h1 class="title">ÉTAT D'AVANCEMENT SOUS-TRAITANT</h1>
        </div>

        <div class="subtitle">
          <p>Chantier: ${data.chantier.nomChantier}</p>
          <p>Sous-traitant: ${data.soustraitant.nom}</p>
          <p>État n°${data.numero} - ${new Date(data.date).toLocaleDateString('fr-FR')}</p>
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
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId } = await context.params

    // Récupérer l'état d'avancement du sous-traitant
    const etatAvancement = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId
      },
      include: {
        soustraitant: true,
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
      }
    })

    if (!etatAvancement) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 })
    }

    // Calcul des totaux
    const totalCommandeInitiale = {
      precedent: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum, ligne) => sum + ligne.montantPrecedent, 0),
      actuel: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum, ligne) => sum + ligne.montantActuel, 0),
      total: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum, ligne) => sum + ligne.montantTotal, 0),
    }

    const totalAvenants = {
      precedent: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum, avenant) => sum + avenant.montantPrecedent, 0),
      actuel: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum, avenant) => sum + avenant.montantActuel, 0),
      total: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum, avenant) => sum + avenant.montantTotal, 0),
    }

    const totalGeneral = {
      precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
      actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
      total: totalCommandeInitiale.total + totalAvenants.total,
    }

    // Données pour le PDF
    const data = {
      ...etatAvancement,
      chantier: chantier,
      lignes: etatAvancement.ligne_soustraitant_etat_avancement,
      avenants: etatAvancement.avenant_soustraitant_etat_avancement,
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral
    }

    // Générer le HTML
    const html = generateHTML(data, settings)

    // Lancer Puppeteer
    const browser = await puppeteer.launch({
      headless: true
    })
    const page = await browser.newPage()
    
    // Définir le contenu de la page
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; padding: 10px; border-top: 1px solid #eee; background-color: white; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>${settings.name} - ${settings.address}</span>
          <span style="margin-right: 20px;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `
    })

    await browser.close()

    // Créer le dossier des documents s'il n'existe pas
    const documentsDir = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true })
    }

    const fileName = `etat-avancement-soustraitant-${soustraitantId}-${etatId}-${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(documentsDir, fileName)

    // Sauvegarder le PDF
    await fs.promises.writeFile(filePath, pdfBuffer)

    // Créer l'entrée dans la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (user) {
      await prisma.document.create({
        data: {
          nom: `État d'avancement sous-traitant n°${etatAvancement.numero}`,
          type: 'ETAT_AVANCEMENT_SOUSTRAITANT',
          url: `/chantiers/${chantierId}/documents/${fileName}`,
          taille: pdfBuffer.length,
          mimeType: 'application/pdf',
          updatedAt: new Date(),
          chantier: {
            connect: {
              chantierId: chantierId
            }
          },
          user: {
            connect: {
              id: user.id
            }
          }
        }
      })
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF: ' + (error as Error).message || 'Erreur inconnue' },
      { status: 500 }
    )
  }
} 