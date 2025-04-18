import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// Fonction pour formatter les nombres avec 2 décimales
const formatNumber = (number: number) => {
  // S'assurer que le nombre est bien un nombre
  if (isNaN(number) || number === null || number === undefined) {
    return "0,00";
  }
  
  try {
    return number.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    console.error('Erreur lors du formatage du nombre:', error, number);
    return number.toFixed(2).replace('.', ',');
  }
}

// Fonction pour formatter les montants en euro
const formatCurrency = (number: number) => {
  // S'assurer que le nombre est bien un nombre
  if (isNaN(number) || number === null || number === undefined) {
    return "0,00 €";
  }
  
  try {
    return number.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    });
  } catch (error) {
    console.error('Erreur lors du formatage du montant:', error, number);
    return number.toFixed(2).replace('.', ',') + ' €';
  }
}

// Couleur primaire pour les entêtes 
const primaryColor = [41, 128, 185]; // Bleu

// Fonction pour générer le PDF avec jsPDF
async function genererPDF(etatAvancement: any, chantier: any, settings: any) {
  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Définir marges et dimensions utiles
  const margin = 10;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - (margin * 2);

  // Ajouter le logo s'il existe
  if (settings?.logo) {
    try {
    const logoPath = path.join(process.cwd(), 'public', settings.logo);
    if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
        doc.addImage(logoBase64, 'PNG', margin, margin, 40, 20);
      }
        } catch (error) {
      console.error('Erreur lors du chargement du logo:', error);
    }
  }

  // Titre principal
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ÉTAT D\'AVANCEMENT', pageWidth / 2, margin + 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${etatAvancement.numero}`, pageWidth / 2, margin + 25, { align: 'center' });
  doc.text(`Date: ${new Date(etatAvancement.date).toLocaleDateString('fr-BE')}`, pageWidth / 2, margin + 32, { align: 'center' });

  // Informations du chantier et de l'entreprise dans un bloc
  doc.setFontSize(9);
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, margin + 40, contentWidth, 35, 2, 2, 'FD');

  // Informations du chantier (colonne gauche)
  doc.setFont('helvetica', 'bold');
  doc.text('CHANTIER', margin + 5, margin + 47);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence: ${chantier.chantierId}`, margin + 5, margin + 54);
  doc.text(`Nom: ${chantier.nomChantier}`, margin + 5, margin + 60);
  doc.text(`Adresse: ${chantier.adresseChantier || 'N/A'}`, margin + 5, margin + 66);

  // Informations de l'entreprise (colonne droite)
  if (settings) {
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREPRISE', pageWidth - margin - 60, margin + 47);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.name || 'N/A'}`, pageWidth - margin - 60, margin + 54);
    doc.text(`${settings.address || 'N/A'}, ${settings.zipCode || ''} ${settings.city || ''}`, pageWidth - margin - 60, margin + 60);
    doc.text(`TVA: ${settings.tva || 'N/A'}`, pageWidth - margin - 60, margin + 66);
  }

  // Tableau des lignes de commande
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('COMMANDE INITIALE', margin, margin + 85);
  
  autoTable(doc, {
    startY: margin + 90,
    head: [['Description', 'Quantité', 'Prix unitaire (€)', 'Précédent (€)', 'Actuel (€)', 'Total (€)']],
    body: etatAvancement.lignes.map((ligne: any) => [
      ligne.description,
      formatNumber(ligne.quantite),
      formatNumber(ligne.prixUnitaire),
      formatNumber(ligne.montantPrecedent),
      formatNumber(ligne.montantActuel),
      formatNumber(ligne.montantTotal)
    ]),
    foot: [
      [
        'Total commande initiale',
        '',
        '',
        formatNumber(etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantPrecedent, 0)),
        formatNumber(etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantActuel, 0)),
        formatNumber(etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantTotal, 0))
      ]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]], 
      textColor: [255, 255, 255],
      fontStyle: 'bold' 
    },
    footStyles: { 
      fillColor: [240, 240, 240], 
      fontStyle: 'bold' 
    },
    styles: {
      cellPadding: 3,
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    },
    margin: { top: 70, left: margin, right: margin }
  });

  // Si des avenants existent, créer un tableau pour eux
  if (etatAvancement.avenants && etatAvancement.avenants.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('AVENANTS', margin, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Description', 'Précédent (€)', 'Actuel (€)', 'Total (€)']],
      body: etatAvancement.avenants.map((avenant: any) => [
        avenant.description,
        formatNumber(avenant.montantPrecedent),
        formatNumber(avenant.montantActuel),
        formatNumber(avenant.montantTotal)
      ]),
      foot: [
        [
          'Total avenants',
          formatNumber(etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantPrecedent, 0)),
          formatNumber(etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantActuel, 0)),
          formatNumber(etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantTotal, 0))
        ]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      footStyles: { 
        fillColor: [240, 240, 240], 
        fontStyle: 'bold' 
      },
      styles: {
        cellPadding: 3,
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
  }

  // Résumé des totaux
  const totalCommandeInitiale = {
    precedent: etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantPrecedent, 0),
    actuel: etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantActuel, 0),
    total: etatAvancement.lignes.reduce((sum: number, ligne: any) => sum + ligne.montantTotal, 0)
  };

  const totalAvenants = {
    precedent: etatAvancement.avenants ? etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantPrecedent, 0) : 0,
    actuel: etatAvancement.avenants ? etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantActuel, 0) : 0,
    total: etatAvancement.avenants ? etatAvancement.avenants.reduce((sum: number, avenant: any) => sum + avenant.montantTotal, 0) : 0
  };

  const totalGeneral = {
    precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
    actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
    total: totalCommandeInitiale.total + totalAvenants.total
  };

  // Calculer la TVA
  const tauxTVA = 0.21; // 21%
  const totalHT = totalGeneral.total;
  const totalTVA = totalHT * tauxTVA;
  const totalTTC = totalHT + totalTVA;

  // Ajouter un tableau de résumé
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 180;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RÉCAPITULATIF', margin, finalY);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['', 'Précédent (€)', 'Actuel (€)', 'Total (€)']],
    body: [
      ['Commande initiale', formatCurrency(totalCommandeInitiale.precedent), formatCurrency(totalCommandeInitiale.actuel), formatCurrency(totalCommandeInitiale.total)],
      ['Avenants', formatCurrency(totalAvenants.precedent), formatCurrency(totalAvenants.actuel), formatCurrency(totalAvenants.total)],
      ['TOTAL GÉNÉRAL', formatCurrency(totalGeneral.precedent), formatCurrency(totalGeneral.actuel), formatCurrency(totalGeneral.total)]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'right', cellWidth: 35 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 }
    },
    styles: { cellPadding: 5 },
    margin: { left: 70, right: 70 },
    didParseCell: (data) => {
      // Mise en valeur de la ligne TOTAL GÉNÉRAL
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index > 0) {
          data.cell.styles.fontSize = 10;
        }
      }
    }
  });

  // Afficher les commentaires s'il y en a
  if (etatAvancement.commentaires) {
    const finalY2 = (doc as any).lastAutoTable?.finalY || finalY;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('COMMENTAIRES', margin, finalY2 + 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Utiliser splitTextToSize pour gérer les retours à la ligne
    const commentairesSplit = doc.splitTextToSize(etatAvancement.commentaires, contentWidth);
    doc.text(commentairesSplit, margin, finalY2 + 25);
  }

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${settings?.name || 'Entreprise'} - ${settings?.address || 'Adresse non disponible'} | Page ${i} / ${pageCount}`,
      pageWidth / 2, 
      pageHeight - 10, 
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { chantierId: string; etatId: string } }
) {
  try {
    const paramsResolved = params;
    console.log('Début de la génération du PDF pour l\'état d\'avancement:', paramsResolved.etatId);
    
    // Vérifier la session de l'utilisateur
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('Session non trouvée')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('Session vérifiée avec succès pour:', session.user.email);

    // Récupérer l'état d'avancement
    const etatAvancement = await prisma.etatAvancement.findUnique({
      where: { id: parseInt(paramsResolved.etatId) },
      include: {
        lignes: true,
        avenants: true,
      },
    })

    if (!etatAvancement) {
      console.error('État d\'avancement non trouvé:', paramsResolved.etatId)
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si un document existe déjà pour cet état d'avancement
    const documentExistant = await prisma.document.findFirst({
      where: {
        type: 'ETAT_AVANCEMENT',
        chantierId: paramsResolved.chantierId,
        metadata: {
          equals: { etatId: paramsResolved.etatId }
        }
      }
    });

    console.log('Document existant trouvé:', documentExistant ? 'Oui' : 'Non');
    console.log('Commentaires de l\'état d\'avancement:', etatAvancement.commentaires);

    console.log('État d\'avancement récupéré avec succès:', etatAvancement.id);

    // Récupérer le chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: paramsResolved.chantierId },
    })

    if (!chantier) {
      console.error('Chantier non trouvé:', paramsResolved.chantierId)
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    console.log('Chantier récupéré avec succès:', chantier.chantierId);

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      console.warn('Paramètres de l\'entreprise non trouvés, la génération du PDF continuera sans ces informations');
    }

    // Générer le PDF
    console.log('Génération du PDF avec jsPDF...');
    const pdfBuffer = await genererPDF(etatAvancement, chantier, settings);

    // Créer le dossier des documents s'il n'existe pas
    const documentsDir = path.join(process.cwd(), 'public', 'documents', 'chantiers', paramsResolved.chantierId)
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true })
      console.log(`Dossier créé: ${documentsDir}`);
    }

    const fileName = `etat-avancement-${paramsResolved.etatId}-${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(documentsDir, fileName)
    const publicPath = `/documents/chantiers/${paramsResolved.chantierId}/${fileName}`

    // Sauvegarder le PDF
    await fs.promises.writeFile(filePath, Buffer.from(pdfBuffer))
    console.log(`PDF sauvegardé: ${filePath}`);

    // Créer l'entrée dans la base de données
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (user) {
        if (documentExistant) {
          await prisma.document.update({
            where: { id: documentExistant.id },
            data: {
              updatedAt: new Date(),
              nom: `État d'avancement n°${paramsResolved.etatId}`,
              chantierId: paramsResolved.chantierId,
              url: publicPath,
              taille: Buffer.from(pdfBuffer).length,
            }
          });
        } else {
        await prisma.document.create({
          data: {
              nom: `État d'avancement n°${paramsResolved.etatId}`,
            type: 'ETAT_AVANCEMENT',
              url: publicPath,
              taille: Buffer.from(pdfBuffer).length,
            mimeType: 'application/pdf',
              createdBy: user.id,
              chantierId: paramsResolved.chantierId,
              metadata: { 
                etatId: paramsResolved.etatId
              },
              updatedAt: new Date()
            }
          });
        }
        console.log('Document enregistré dans la base de données');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du document dans la base de données:', error);
      // Continuer même si l'enregistrement échoue
    }

    console.log('Retour du PDF au client');
    return new NextResponse(Buffer.from(pdfBuffer), {
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