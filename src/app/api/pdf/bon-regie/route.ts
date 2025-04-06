import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Fonction auxiliaire pour formater les nombres
function formatNumber(num: number | null) {
  if (num === null) return '-'
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Fonction pour générer le HTML
function generateHTML(data: any) {
  // Convertir la signature en base64 en image intégrée
  const signatureHtml = data.signature 
    ? `<img src="${data.signature}" alt="Signature" style="height: 80px; margin-top: 10px;">`
    : '<p style="font-style: italic; color: #999;">Signature manquante</p>';

  // Calculer le nombre d'heures total
  const totalHeures = (data.tempsChantier || 0) * (data.nombreTechniciens || 1);

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
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 15px;
        }
        .logo {
          width: 150px;
          height: auto;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin: 0;
        }
        .bon-info {
          margin-bottom: 30px;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
        }
        .info-label {
          width: 150px;
          font-weight: bold;
        }
        .info-value {
          flex: 1;
        }
        .travail {
          margin-bottom: 30px;
          padding: 15px;
          background-color: #f4f8ff;
          border-radius: 5px;
        }
        .travail-titre {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2563eb;
        }
        .temps-info {
          margin-bottom: 30px;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
        }
        .temps-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .temps-total {
          font-weight: bold;
          border-top: 1px solid #ddd;
          padding-top: 10px;
          text-align: right;
        }
        .materiaux {
          margin-bottom: 30px;
        }
        .materiaux-titre {
          font-weight: bold;
          margin-bottom: 10px;
        }
        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: flex-end;
        }
        .signature-container {
          text-align: center;
          width: 300px;
        }
        .signature-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .date-signature {
          font-size: 14px;
          margin-top: 5px;
          color: #666;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public/images/logo.png')).toString('base64')}" alt="Logo" class="logo">
        <h1 class="title">BON DE TRAVAUX EN RÉGIE</h1>
      </div>
      
      <div class="bon-info">
        <div class="info-row">
          <div class="info-label">Date:</div>
          <div class="info-value">${data.dates}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Client:</div>
          <div class="info-value">${data.client}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Chantier:</div>
          <div class="info-value">${data.nomChantier}</div>
        </div>
      </div>
      
      <div class="travail">
        <div class="travail-titre">TRAVAIL RÉALISÉ:</div>
        <div>${data.description}</div>
      </div>
      
      <div class="temps-info">
        <div class="temps-row">
          <div><strong>Temps sur chantier:</strong></div>
          <div>${formatNumber(data.tempsChantier || 0)} heures</div>
        </div>
        <div class="temps-row">
          <div><strong>Nombre d'ouvriers:</strong></div>
          <div>${data.nombreTechniciens || 1}</div>
        </div>
        <div class="temps-total">
          Total des heures: ${formatNumber(totalHeures)} heures
        </div>
      </div>
      
      <div class="materiaux">
        <div class="materiaux-titre">MATÉRIAUX UTILISÉS:</div>
        <p>${data.materiaux || 'Aucun matériau spécifié'}</p>
      </div>
      
      <div class="signature-section">
        <div class="signature-container">
          <div class="signature-label">Signature du responsable:</div>
          ${signatureHtml}
          <div class="signature-name">${data.nomSignataire}</div>
          <div class="date-signature">Le ${new Date(data.dateSignature).toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>Ce document atteste de la réalisation des travaux en régie mentionnés ci-dessus.</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { bonRegieId } = body;

    if (!bonRegieId) {
      return NextResponse.json(
        { error: 'ID du bon de régie manquant' },
        { status: 400 }
      );
    }

    // Récupérer les données du bon de régie
    const bonRegie = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `;

    if (!Array.isArray(bonRegie) || bonRegie.length === 0) {
      return NextResponse.json(
        { error: 'Bon de régie non trouvé' },
        { status: 404 }
      );
    }

    const data = bonRegie[0];

    // Générer le HTML pour le PDF
    const html = generateHTML(data);

    // Lancer Puppeteer pour générer le PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });
    
    await browser.close();

    // Si le bon de régie est associé à un chantier, sauvegarder le PDF comme document du chantier
    if (data.chantierId) {
      // Créer un blob pour l'enregistrer comme fichier
      const pdfFileName = `bon-regie-${bonRegieId}-${new Date().getTime()}.pdf`;
      
      try {
        // Sauvegarder le fichier PDF en tant que document du chantier
        await prisma.document.create({
          data: {
            nom: `Bon de régie - ${data.client} - ${data.dates}`,
            type: 'BON_REGIE',
            mimeType: 'application/pdf',
            url: `/uploads/${pdfFileName}`,
            taille: pdfBuffer.length,
            chantierId: data.chantierId,
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Écrire le fichier PDF sur le disque
        const uploadsDir = path.join(process.cwd(), 'public/uploads');
        
        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadsDir, pdfFileName), pdfBuffer);
        
        console.log(`PDF du bon de régie ${bonRegieId} sauvegardé comme document du chantier ${data.chantierId}`);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du PDF comme document:', error);
        // On continue même en cas d'erreur pour renvoyer le PDF à l'utilisateur
      }
    }
    
    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bon-regie-${bonRegieId}.pdf"`
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
} 