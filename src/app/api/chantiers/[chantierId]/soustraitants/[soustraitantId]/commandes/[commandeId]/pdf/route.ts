import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string; commandeId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer la commande sous-traitant
    const commande = await prisma.$queryRaw`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail,
        s.contact as soustraitantContact,
        s.adresse as soustraitantAdresse,
        s.telephone as soustraitantTelephone,
        s.tva as soustraitantTVA
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.chantierId
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(params.commandeId)}
      AND c.chantierId = ${params.chantierId}
      AND c.soustraitantId = ${params.soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    const commandeData = commande[0]

    // Récupérer les lignes de commande
    const lignes = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
      ORDER BY ordre ASC
    ` as any[]

    // Récupérer les paramètres de l'entreprise
    const companySettings = await prisma.companysettings.findUnique({
      where: { id: 'COMPANY_SETTINGS' }
    })

    if (!companySettings) {
      return NextResponse.json(
        { error: 'Paramètres de l\'entreprise non trouvés' },
        { status: 500 }
      )
    }

    // Créer un nouveau document PDF avec orientation paysage pour plus d'espace
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Ajouter un titre
    doc.setFontSize(18);
    doc.text('BON DE COMMANDE SOUS-TRAITANT', doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    // Ajouter les informations de l'entreprise
    doc.setFontSize(10);
    doc.text(companySettings.name, 14, 30);
    doc.text(`Adresse: ${companySettings.address}`, 14, 35);
    doc.text(`${companySettings.zipCode} ${companySettings.city}`, 14, 40);
    doc.text(`Téléphone: ${companySettings.phone}`, 14, 45);
    doc.text(`Email: ${companySettings.email}`, 14, 50);
    doc.text(`TVA: ${companySettings.tva}`, 14, 55);
    
    // Ajouter les informations du sous-traitant
    doc.setFontSize(12);
    doc.text('Sous-traitant:', 150, 30);
    doc.setFontSize(10);
    doc.text(commandeData.soustraitantNom, 150, 35);
    if (commandeData.soustraitantAdresse) {
      doc.text(`Adresse: ${commandeData.soustraitantAdresse}`, 150, 40);
    }
    if (commandeData.soustraitantTelephone) {
      doc.text(`Téléphone: ${commandeData.soustraitantTelephone}`, 150, 45);
    }
    doc.text(`Email: ${commandeData.soustraitantEmail}`, 150, 50);
    if (commandeData.soustraitantTVA) {
      doc.text(`TVA: ${commandeData.soustraitantTVA}`, 150, 55);
    }
    
    // Ajouter les informations du chantier
    doc.setFontSize(12);
    doc.text('Chantier:', 220, 30);
    doc.setFontSize(10);
    doc.text(commandeData.nomChantier, 220, 35);
    
    // Ajouter les informations de la commande
    doc.setFontSize(12);
    doc.text('Informations de la commande:', 14, 70);
    doc.setFontSize(10);
    doc.text(`Référence: ${commandeData.reference || `#${commandeData.id}`}`, 14, 75);
    doc.text(`Date: ${new Date(commandeData.dateCommande).toLocaleDateString('fr-FR')}`, 14, 80);
    
    // Ajouter les lignes de commande dans un tableau
    const tableColumn = ["#", "Article", "Description", "Type", "Unité", "Prix Unit.", "Quantité", "Total"];
    const tableRows = lignes.map((ligne, index) => [
      index + 1,
      ligne.article || '',
      ligne.description || '',
      ligne.type || '',
      ligne.unite || '',
      `${(ligne.prixUnitaire || 0).toFixed(2)} €`,
      (ligne.quantite || 0).toFixed(2),
      `${(ligne.total || 0).toFixed(2)} €`
    ]);
    
    // Ajouter le tableau au document
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 95,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      margin: { top: 95 },
      didDrawPage: (data: any) => {
        // Ajouter un pied de page avec numéro de page
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} sur ${doc.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    // Calculer la position Y pour le résumé (après le tableau)
    const finalY = (doc as any).lastAutoTable?.finalY + 10 || 150;
    
    // Ajouter uniquement le total en gras (suppression du sous-total)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    // Positionner le total sous la colonne "Total" (dernière colonne du tableau)
    // Calculer la position X en fonction de la largeur du document et de la marge
    const totalX = doc.internal.pageSize.width - 20; // Position plus à droite pour aligner avec la colonne Total
    doc.text(`TOTAL HT: ${(commandeData.sousTotal || 0).toFixed(2)} €`, totalX, finalY, { align: 'right' });
    
    // Ajouter des conditions générales
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const footerY = doc.internal.pageSize.height - 30;
    doc.text('Conditions générales:', 14, footerY);
    doc.text('1. Paiement à 30 jours après réception de la facture.', 14, footerY + 5);
    doc.text('2. Les prix sont en euros et hors taxes sauf indication contraire.', 14, footerY + 10);
    doc.text('3. La présente commande est soumise aux conditions générales de vente de l\'entreprise.', 14, footerY + 15);
    
    // Espaces pour signatures
    doc.setFontSize(10);
    doc.text('Pour l\'entreprise:', 14, footerY - 25);
    doc.text('Pour le sous-traitant:', 100, footerY - 25);
    doc.text('Nom et signature:', 14, footerY - 20);
    doc.text('Nom et signature:', 100, footerY - 20);
    
    // Convertir le PDF en buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="commande_soustraitant_${commandeData.reference || commandeData.id}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
} 