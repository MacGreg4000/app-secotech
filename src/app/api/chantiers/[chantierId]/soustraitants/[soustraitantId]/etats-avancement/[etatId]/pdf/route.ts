import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

// Fonction pour formater les nombres
function formatNumber(num: number): string {
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  })
}

// Fonction pour formater les grands nombres (colonne Total)
function formatCurrency(num: number): string {
  // Format sans le symbole € et sans espace entre les chiffres
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
}

// Fonction pour générer le PDF avec jsPDF
async function genererPDF(chantierId: string, soustraitantId: string, etatId: string): Promise<{ pdfBuffer: Buffer; pdfPath: string; nouveauDocument: boolean }> {
  // Récupérer les données de l'état d'avancement
  const etatAvancement = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
      soustraitant: true,
      commande_soustraitant: {
        include: {
          lignes: true
        }
      }
    },
  });

    if (!etatAvancement) {
    throw new Error('État d\'avancement sous-traitant non trouvé');
    }

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
    where: {
      chantierId: chantierId,
    },
  });

    if (!chantier) {
    throw new Error('Chantier non trouvé');
  }

  // Récupérer les informations du sous-traitant
  const sousTraitant = await prisma.soustraitant.findUnique({
    where: {
      id: soustraitantId,
    },
  });

  if (!sousTraitant) {
    throw new Error('Sous-traitant non trouvé');
  }

  // Récupérer les paramètres de l'entreprise
  const settings = await prisma.companysettings.findFirst();
    if (!settings) {
    throw new Error('Paramètres de l\'entreprise non trouvés');
  }

  // Récupérer la commande du sous-traitant
  const commande = await prisma.commandeSousTraitant.findFirst({
    where: {
      chantierId: chantierId,
      soustraitantId: soustraitantId,
    },
    include: {
      lignes: true,
    },
  });

  if (!commande) {
    throw new Error('Commande sous-traitant non trouvée');
    }

    // Calcul des totaux
    const totalCommandeInitiale = {
    precedent: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum: number, ligne: any) => sum + ligne.montantPrecedent, 0),
    actuel: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum: number, ligne: any) => sum + ligne.montantActuel, 0),
    total: etatAvancement.ligne_soustraitant_etat_avancement.reduce((sum: number, ligne: any) => sum + ligne.montantTotal, 0),
  };

    const totalAvenants = {
    precedent: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum: number, avenant: any) => sum + avenant.montantPrecedent, 0),
    actuel: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum: number, avenant: any) => sum + avenant.montantActuel, 0),
    total: etatAvancement.avenant_soustraitant_etat_avancement.reduce((sum: number, avenant: any) => sum + avenant.montantTotal, 0),
  };

    const totalGeneral = {
      precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
      actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
      total: totalCommandeInitiale.total + totalAvenants.total,
  };

  // Pour l'affichage de la référence de commande
  const commandeReference = commande?.reference || 'N/A';

  // Créer un nouveau document PDF avec orientation paysage pour plus d'espace
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Paramètres pour le design
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * margin;
  
  // Couleurs pour le design
  const primaryColor = [0, 51, 102]; // Bleu marine

  // Charger le logo
  let logoBase64;
  try {
    const logoPath = path.join(process.cwd(), 'public/assets/images/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Erreur lors du chargement du logo:', error);
  }

  // En-tête avec logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, margin, 30, 15);
  }

  // Titre du document
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ÉTAT D\'AVANCEMENT SOUS-TRAITANT', pageWidth / 2, margin + 10, { align: 'center' });

  // Ligne de séparation sous le titre
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  // Bloc de données de référence
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, margin + 20, contentWidth, 30, 'F');
  
  // Bordure du bloc de référence
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, margin + 20, contentWidth, 30);
  
  // Information de référence
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Chantier:', margin + 5, margin + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(chantier.nomChantier, margin + 35, margin + 27);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Sous-traitant:', margin + 5, margin + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(sousTraitant.nom, margin + 35, margin + 35);
  
  doc.setFont('helvetica', 'bold');
  doc.text('État n°:', margin + 5, margin + 43);
  doc.setFont('helvetica', 'normal');
  doc.text(`${etatAvancement.numero}`, margin + 35, margin + 43);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth / 2, margin + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(etatAvancement.date).toLocaleDateString('fr-FR'), pageWidth / 2 + 20, margin + 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Commande n°:', pageWidth / 2, margin + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(commandeReference, pageWidth / 2 + 30, margin + 35);

  // Données pour le tableau des lignes de commande
  const tableColumn = [
    "Article", "Description", "Type", "Un.", "P.U.", "Qté", "Total", "Qté P.", "Qté A.", "Qté T.", "Mt. P.", "Mt. A.", "Mt. T."
  ];
  
  const tableRows = etatAvancement.ligne_soustraitant_etat_avancement.map(ligne => [
    ligne.article,
    ligne.description,
    ligne.type,
    ligne.unite,
    formatNumber(ligne.prixUnitaire),
    formatNumber(ligne.quantite),
    formatCurrency(ligne.prixUnitaire * ligne.quantite),
    formatNumber(ligne.quantitePrecedente),
    formatNumber(ligne.quantiteActuelle),
    formatNumber(ligne.quantiteTotale),
    formatCurrency(ligne.montantPrecedent),
    formatCurrency(ligne.montantActuel),
    formatCurrency(ligne.montantTotal)
  ]);
  
  // Utiliser autoTable pour le tableau des lignes
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: margin + 55,
    theme: 'grid',
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 40 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
      11: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
      12: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } }
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      font: 'helvetica'
    },
    margin: { left: margin, right: margin }
  });
  
  // Position pour la suite après le tableau
  const finalY = (doc as any).lastAutoTable?.finalY || (margin + 100);
  
  // Ajouter les avenants si présents
  if (etatAvancement.avenant_soustraitant_etat_avancement && etatAvancement.avenant_soustraitant_etat_avancement.length > 0) {
    // Titre section avenants
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('AVENANTS', margin, finalY + 10);
    
    // Tableau des avenants
    const avenantRows = etatAvancement.avenant_soustraitant_etat_avancement.map(avenant => [
      avenant.article,
      avenant.description,
      avenant.type,
      avenant.unite,
      formatNumber(avenant.prixUnitaire),
      formatNumber(avenant.quantite),
      formatCurrency(avenant.prixUnitaire * avenant.quantite),
      formatNumber(avenant.quantitePrecedente),
      formatNumber(avenant.quantiteActuelle),
      formatNumber(avenant.quantiteTotale),
      formatCurrency(avenant.montantPrecedent),
      formatCurrency(avenant.montantActuel),
      formatCurrency(avenant.montantTotal)
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: avenantRows,
      startY: finalY + 15,
      theme: 'grid',
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 40 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
        11: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } },
        12: { halign: 'right', cellWidth: 25, cellPadding: { right: 5 } }
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        font: 'helvetica'
      },
      margin: { left: margin, right: margin }
    });
  }
  
  // Position après le tableau des avenants
  const finalY2 = (doc as any).lastAutoTable?.finalY || finalY;
  
  // Récapitulatif
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RÉCAPITULATIF', margin, finalY2 + 15);
  
  // Tableau récapitulatif
  const recapRows = [
    ['Commande initiale', formatCurrency(totalCommandeInitiale.precedent), formatCurrency(totalCommandeInitiale.actuel), formatCurrency(totalCommandeInitiale.total)],
    ['Avenants', formatCurrency(totalAvenants.precedent), formatCurrency(totalAvenants.actuel), formatCurrency(totalAvenants.total)],
    ['TOTAL GÉNÉRAL', formatCurrency(totalGeneral.precedent), formatCurrency(totalGeneral.actuel), formatCurrency(totalGeneral.total)]
  ];
  
  autoTable(doc, {
    head: [['', 'Montant précédent', 'Montant actuel', 'Montant total']],
    body: recapRows,
    startY: finalY2 + 20,
    theme: 'grid',
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    margin: { left: margin + 50, right: margin + 50 },
    didParseCell: (data) => {
      // Mise en valeur du total général
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index > 0) {
          data.cell.styles.fontSize = 10;
        }
      }
    }
  });
  
  // Commentaires si présents
  if (etatAvancement.commentaires) {
    const finalY3 = (doc as any).lastAutoTable?.finalY || finalY2;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('COMMENTAIRES', margin, finalY3 + 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Utiliser splitTextToSize pour gérer les retours à la ligne
    const commentairesSplit = doc.splitTextToSize(etatAvancement.commentaires, contentWidth);
    doc.text(commentairesSplit, margin, finalY3 + 25);
  }
  
  // Pied de page
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}`, margin, pageHeight - 10);
  doc.text(`TVA: ${settings.tva} | Tél: ${settings.phone} | Email: ${settings.email}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Page 1/1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  console.log('PDF sous-traitant généré avec succès via jsPDF');

  // Créer les répertoires nécessaires
  const documentDir = path.join(process.cwd(), 'public/documents/chantiers', chantierId, 'soustraitants', soustraitantId);
  const etatsDir = path.join(documentDir, 'etats-avancement');
  
  await fs.promises.mkdir(etatsDir, { recursive: true });
  
  // Chemin complet du fichier
  const fileName = `etat-avancement-${etatAvancement.numero}-${Date.now()}.pdf`;
  const filePath = path.join(etatsDir, fileName);
  
  // Enregistrer le PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await fs.promises.writeFile(filePath, pdfBuffer);
  
  // URL relative pour accéder au fichier
  const fileUrl = `/documents/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${fileName}`;
  
  // Créer un nom de document basé sur l'ID
  const documentNom = `État d'avancement sous-traitant - ${etatAvancement.numero}`;
  
  // Vérifier si un document existe déjà pour cet état d'avancement
  let nouveauDocument = false;
  const session = await getServerSession(authOptions);
  const jsonFilter = { etatId };
  
  const existingDocument = await prisma.document.findFirst({
    where: {
      type: 'ETAT_AVANCEMENT_SOUSTRAITANT',
      chantierId: chantierId,
      metadata: {
        equals: jsonFilter
      }
    }
  });
  
  if (existingDocument) {
    await prisma.document.update({
      where: { id: existingDocument.id },
      data: {
        updatedAt: new Date(),
        nom: `Etat d'avancement n°${etatAvancement.numero || ''} - ${etatAvancement.soustraitant?.nom || 'Sous-traitant'}`,
        chantierId: chantierId,
        metadata: jsonFilter
      }
    });
  } else {
    nouveauDocument = true;
      await prisma.document.create({
        data: {
        nom: `Etat d'avancement n°${etatAvancement.numero || ''} - ${etatAvancement.soustraitant?.nom || 'Sous-traitant'}`,
          type: 'ETAT_AVANCEMENT_SOUSTRAITANT',
        url: fileUrl,
          taille: pdfBuffer.length,
          mimeType: 'application/pdf',
        createdBy: session?.user?.id || 'SYSTEM',
        chantierId: chantierId,
        metadata: jsonFilter,
        updatedAt: new Date()
      }
    });
  }

  return { pdfBuffer, pdfPath: filePath, nouveauDocument };
}

// Corriger l'erreur liée à l'utilisation de puppeteer ailleurs dans le code
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { chantierId: string; soustraitantId: string; etatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const paramsResolved = await params;
    const chantierId = paramsResolved.chantierId;
    const soustraitantId = paramsResolved.soustraitantId;
    const etatId = paramsResolved.etatId;

    // Récupérer l'état d'avancement sous-traitant avec plus de relations
    const etatAvancement = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        etat_avancement: true,
        soustraitant: true,
      },
    });

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'état d'avancement appartient au chantier et au sous-traitant spécifiés
    if (etatAvancement.etat_avancement.chantierId !== chantierId || etatAvancement.soustraitantId !== soustraitantId) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé pour ce chantier ou ce sous-traitant' },
        { status: 404 }
      );
    }

    // Générer le PDF
    const { pdfBuffer, pdfPath, nouveauDocument } = await genererPDF(chantierId, soustraitantId, etatId);

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="etat-avancement-soustraitant-${etatId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
} 