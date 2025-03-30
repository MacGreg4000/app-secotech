'use client'

import { RefObject } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface PDFGeneratorProps {
  elementRef: RefObject<HTMLDivElement>;
  title: string;
  subtitle: string;
  setGeneratingState: (isGenerating: boolean) => void;
}

export const generatePDF = async ({
  elementRef,
  title,
  subtitle,
  setGeneratingState
}: PDFGeneratorProps): Promise<void> => {
  if (!elementRef.current) return;
  
  try {
    setGeneratingState(true);
    
    // Attendre que les graphiques soient complètement rendus
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const content = elementRef.current;
    const canvas = await html2canvas(content, {
      scale: 2, // Meilleure qualité
      useCORS: true, // Pour les images externes
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Créer un nouveau document PDF au format A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Dimensions du PDF
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculer les dimensions pour maintenir le ratio
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    
    let imgWidth = pdfWidth - 20; // Marges de 10mm de chaque côté
    let imgHeight = imgWidth / ratio;
    
    // Si l'image est trop haute, ajuster la hauteur
    if (imgHeight > pdfHeight - 40) { // Marges de 20mm en haut et en bas
      imgHeight = pdfHeight - 40;
      imgWidth = imgHeight * ratio;
    }
    
    // Ajouter un titre
    pdf.setFontSize(18);
    pdf.setTextColor(44, 62, 80); // Couleur foncée pour le titre
    pdf.text(title, pdfWidth / 2, 20, { align: 'center' });
    
    // Ajouter un sous-titre
    pdf.setFontSize(14);
    pdf.setTextColor(52, 73, 94);
    pdf.text(subtitle, pdfWidth / 2, 30, { align: 'center' });
    
    // Ajouter la date
    pdf.setFontSize(10);
    pdf.setTextColor(127, 140, 141);
    const today = new Date().toLocaleDateString('fr-FR');
    pdf.text(`Généré le ${today}`, pdfWidth / 2, 37, { align: 'center' });
    
    // Ajouter l'image du canvas au PDF avec centrage
    const xPos = (pdfWidth - imgWidth) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xPos, 40, imgWidth, imgHeight);
    
    // Ajouter un pied de page
    pdf.setFontSize(8);
    pdf.setTextColor(127, 140, 141);
    pdf.text('© AppSecotech - Document généré automatiquement', pdfWidth / 2, pdfHeight - 10, { align: 'center' });
    
    // Télécharger le PDF
    pdf.save(`resume-financier-${today.replace(/\//g, '-')}.pdf`);
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
  } finally {
    setGeneratingState(false);
  }
}; 