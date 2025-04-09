import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { prisma } from '@/lib/prisma/client'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import crypto from 'crypto'

// Chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// Fonction pour récupérer les informations de l'entreprise depuis la base de données
async function getCompanyInfo() {
  try {
    const settings = await prisma.companysettings.findFirst();
    
    if (!settings) {
      console.warn("Aucune information d'entreprise trouvée dans la base de données");
      return {
        nom: 'Secotech SRL',
        adresse: 'Rue Frumhy, 20, 4671 Barchon',
        ville: 'Barchon',
        telephone: '0032(0)498 32 49 49',
        email: 'info@secotech.be',
        tva: 'BE0537822042'
      };
    }
    
    return {
      nom: settings.name,
      adresse: `${settings.address}, ${settings.zipCode} ${settings.city}`,
      ville: settings.city,
      telephone: settings.phone,
      email: settings.email,
      tva: settings.tva
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'entreprise:", error);
    // Valeurs par défaut en cas d'erreur
    return {
      nom: 'Secotech SRL',
      adresse: 'Rue Frumhy, 20, 4671 Barchon',
      ville: 'Barchon',
      telephone: '0032(0)498 32 49 49',
      email: 'info@secotech.be',
      tva: 'BE0537822042'
    };
  }
}

/**
 * Génère un contrat de sous-traitance pour un sous-traitant
 * @param soustraitantId Identifiant du sous-traitant
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns L'URL du contrat généré
 */
export async function generateContratSoustraitance(soustraitantId: string, userId: string): Promise<string> {
  try {
    console.log('Début de la génération du contrat pour soustraitantId:', soustraitantId);
    
    // Récupérer les données du sous-traitant
    console.log('Récupération des données du sous-traitant...');
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })
    
    if (!soustraitant) {
      console.error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`);
      throw new Error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`)
    }
    
    console.log('Sous-traitant trouvé:', soustraitant.nom);
    
    // Récupérer les informations de l'entreprise
    console.log('Récupération des informations de l\'entreprise...');
    const companyInfo = await getCompanyInfo();
    console.log('Informations de l\'entreprise récupérées:', companyInfo.nom);
    
    // Récupérer le logo de l'entreprise
    console.log('Récupération du logo de l\'entreprise...');
    let logoBuffer
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      console.log('Chemin du logo:', logoPath);
      logoBuffer = await readFile(logoPath)
      console.log('Logo récupéré, taille:', logoBuffer.length, 'octets');
    } catch (error) {
      console.error('Erreur lors de la lecture du logo:', error)
    }
    
    // Récupérer l'image de la signature
    console.log('Récupération de l\'image de la signature...');
    let signatureBuffer
    try {
      const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
      console.log('Chemin de la signature:', signaturePath);
      signatureBuffer = await readFile(signaturePath)
      console.log('Signature récupérée, taille:', signatureBuffer.length, 'octets');
    } catch (error) {
      console.error('Erreur lors de la lecture de la signature:', error)
    }
    
    // Date de génération formatée
    console.log('Formatage des dates...');
    const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr })
    const dateFin = format(addYears(new Date(), 1), 'dd/MM/yyyy', { locale: fr })
    
    // Générer un token unique pour la signature électronique
    console.log('Génération du token...');
    const token = crypto.randomBytes(32).toString('hex')
    
    // Créer le dossier pour le sous-traitant s'il n'existe pas
    console.log('Création du dossier pour le sous-traitant...');
    const soustraitantFolder = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const soustraitantDir = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantFolder)
    console.log('Dossier à créer:', soustraitantDir);
    try {
      await mkdir(soustraitantDir, { recursive: true })
      console.log('Dossier créé avec succès');
    } catch (mkdirError) {
      console.error('Erreur lors de la création du dossier:', mkdirError);
      // Continuer malgré l'erreur et tenter de sauvegarder le fichier
    }
    
    // Nom du fichier PDF
    console.log('Préparation du fichier PDF...');
    const fileName = `Contrat-${soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}.pdf`
    const filePath = join(soustraitantDir, fileName)
    console.log('Chemin du fichier PDF à créer:', filePath);
    
    // Créer un nouveau document PDF
    console.log('Création du document PDF...');
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    console.log('Document PDF créé');
    
    // Ajouter une page
    console.log('Ajout d\'une page...');
    const page = pdfDoc.addPage([595, 842]) // Format A4
    console.log('Page ajoutée');
    
    // Charger les polices
    console.log('Chargement des polices...');
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    console.log('Polices chargées');
    
    // Ajouter le logo s'il existe
    if (logoBuffer) {
      const logoImage = await pdfDoc.embedPng(logoBuffer)
      const logoSize = logoImage.scale(0.45) // Réduire légèrement la taille à 45%
      
      // Centrer le logo en haut de la page
      page.drawImage(logoImage, {
        x: (page.getWidth() - logoSize.width) / 2, // Centrer horizontalement
        y: page.getHeight() - logoSize.height - 40,
        width: logoSize.width,
        height: logoSize.height,
      })
    }
    
    // Ajouter le titre avec un espace suffisant sous le logo
    page.drawText('CONTRAT DE SOUS-TRAITANCE', {
      x: 150,
      y: page.getHeight() - 230, // Augmenter l'espacement
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations des parties avec espacement suffisant après le titre
    page.drawText('Entre les soussignés :', {
      x: 50,
      y: page.getHeight() - 260, // Augmenter l'espacement
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations de l'entreprise
    page.drawText(`${companyInfo.nom}`, {
      x: 50,
      y: page.getHeight() - 290, // Ajuster tous les espacements
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`${companyInfo.adresse}`, {
      x: 50,
      y: page.getHeight() - 310,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`TVA : ${companyInfo.tva}`, {
      x: 50,
      y: page.getHeight() - 330,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Tél : ${companyInfo.telephone}`, {
      x: 50,
      y: page.getHeight() - 350,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Email : ${companyInfo.email}`, {
      x: 50,
      y: page.getHeight() - 370,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Représentée par Maccio Grégory`, {
      x: 50,
      y: page.getHeight() - 390,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Ci-après dénommée "l'Entrepreneur principal"`, {
      x: 50,
      y: page.getHeight() - 410,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Séparateur
    page.drawText(`Et`, {
      x: 50,
      y: page.getHeight() - 440,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations du sous-traitant
    page.drawText(`${soustraitant.nom}`, {
      x: 50,
      y: page.getHeight() - 470,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`${soustraitant.adresse || 'Adresse non spécifiée'}`, {
      x: 50,
      y: page.getHeight() - 490,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`TVA : ${(soustraitant as any).tva || 'Non spécifié'}`, {
      x: 50,
      y: page.getHeight() - 510,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Tél : ${soustraitant.telephone || 'Non spécifié'}`, {
      x: 50,
      y: page.getHeight() - 530,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Email : ${soustraitant.email || 'Non spécifié'}`, {
      x: 50,
      y: page.getHeight() - 550,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Représentée par ${soustraitant.contact || soustraitant.nom}`, {
      x: 50,
      y: page.getHeight() - 570,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Ci-après dénommée "le Sous-traitant"`, {
      x: 50,
      y: page.getHeight() - 590,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Titre des clauses
    page.drawText(`Il a été convenu ce qui suit :`, {
      x: 50,
      y: page.getHeight() - 630,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Article 1
    page.drawText(`Article 1 - Objet du contrat`, {
      x: 50,
      y: page.getHeight() - 660,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`L'Entrepreneur principal confie au Sous-traitant, qui accepte, l'exécution des`, {
      x: 50,
      y: page.getHeight() - 680,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`travaux de construction sur les chantiers qui lui seront confiés par bon de commande.`, {
      x: 50,
      y: page.getHeight() - 695,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Article 2
    page.drawText(`Article 2 - Durée du contrat`, {
      x: 50,
      y: page.getHeight() - 725,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Le présent contrat est conclu pour une période du ${format(new Date(), 'dd/MM/yyyy')} au ${dateFin}.`, {
      x: 50,
      y: page.getHeight() - 745,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Seconde page
    const page2 = pdfDoc.addPage([595, 842])
    
    // Articles 3-10 (version simplifiée)
    let yPos = page2.getHeight() - 50;
    
    // Article 3
    yPos -= 30;
    page2.drawText(`Article 3 - Prix et modalités de paiement`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page2.drawText(`Les prix des travaux seront fixés dans chaque bon de commande spécifique.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Le Sous-traitant établira une facture à la fin de chaque mois pour les travaux réalisés.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Les factures seront payables à 30 jours fin de mois, par virement bancaire.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Article 4
    yPos -= 30;
    page2.drawText(`Article 4 - Obligations du Sous-traitant`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`Le Sous-traitant s'engage à :`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const obligations = [
      `Exécuter les travaux avec le plus grand soin et dans les délais convenus`,
      `Respecter toutes les normes de sécurité en vigueur`,
      `Fournir tout le matériel nécessaire à l'exécution des travaux`,
      `Souscrire toutes les assurances nécessaires à son activité`,
      `Respecter la législation sociale et fiscale`,
      `Ne pas sous-traiter tout ou partie des travaux sans l'accord écrit de l'Entrepreneur`
    ];

    for (const obligation of obligations) {
      yPos -= 15;
      page2.drawText(`- ${obligation}`, {
        x: 60, // Indentation pour les puces
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Article 5
    yPos -= 30;
    page2.drawText(`Article 5 - Obligations de l'Entrepreneur principal`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`L'Entrepreneur principal s'engage à :`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const obligationsEntrepreneur = [
      `Fournir au Sous-traitant toutes les informations nécessaires à la bonne exécution des travaux`,
      `Payer les factures du Sous-traitant dans les délais convenus`,
      `Permettre au Sous-traitant l'accès aux chantiers`
    ];

    for (const obligation of obligationsEntrepreneur) {
      yPos -= 15;
      page2.drawText(`- ${obligation}`, {
        x: 60,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Article 6
    yPos -= 30;
    page2.drawText(`Article 6 - Responsabilité et garanties`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`Le Sous-traitant est responsable de la bonne exécution des travaux qui lui sont confiés.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Il garantit l'Entrepreneur principal contre tous recours et actions exercés contre ce dernier,`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`du fait de l'inexécution de ses obligations par le Sous-traitant.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Si la page est presque pleine, ajouter une nouvelle page
    if (yPos < 200) {
      const page3 = pdfDoc.addPage([595, 842]);
      yPos = page3.getHeight() - 50;
      
      // Articles 7-10 sur la nouvelle page
      // Article 7
      yPos -= 30;
      page3.drawText(`Article 7 - Confidentialité`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page3.drawText(`Le Sous-traitant s'engage à garder confidentielles toutes les informations dont il pourrait`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page3.drawText(`avoir connaissance dans le cadre de l'exécution du présent contrat.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 8
      yPos -= 30;
      page3.drawText(`Article 8 - Résiliation`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page3.drawText(`En cas de manquement par l'une des parties à l'une quelconque de ses obligations, l'autre partie`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page3.drawText(`pourra résilier le présent contrat après mise en demeure restée sans effet pendant 15 jours.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 9
      yPos -= 30;
      page3.drawText(`Article 9 - Litiges`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page3.drawText(`En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page3.drawText(`s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux de Liège.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 10
      yPos -= 30;
      page3.drawText(`Article 10 - Droit applicable`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page3.drawText(`Le présent contrat est soumis au droit belge.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Date et signatures
      yPos -= 60;
      page3.drawText(`Fait à ${companyInfo.ville}, le ${dateGeneration}, en deux exemplaires originaux.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Zone de signatures
      yPos -= 40;
      page3.drawText(`Pour l'Entrepreneur principal`, {
        x: 100,
        y: yPos,
        size: 10,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      page3.drawText(`Pour le Sous-traitant`, {
        x: 350,
        y: yPos,
        size: 10,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page3.drawText(`Maccio Grégory`, {
        x: 100,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      page3.drawText(`${soustraitant.contact || soustraitant.nom}`, {
        x: 350,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Ajouter la signature si elle existe
      if (signatureBuffer) {
        const signatureImagePrincipal = await pdfDoc.embedPng(signatureBuffer)
        const signatureSizePrincipal = signatureImagePrincipal.scale(0.12) // Réduire davantage la taille de la signature
        
        page3.drawImage(signatureImagePrincipal, {
          x: 100,
          y: yPos - 40, // Remonter la position pour éviter le débordement
          width: signatureSizePrincipal.width,
          height: signatureSizePrincipal.height,
        })
      }
    } else {
      // Articles 7-10 sur la même page si suffisamment d'espace
      // Article 7
      yPos -= 30;
      page2.drawText(`Article 7 - Confidentialité`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page2.drawText(`Le Sous-traitant s'engage à garder confidentielles toutes les informations dont il pourrait`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page2.drawText(`avoir connaissance dans le cadre de l'exécution du présent contrat.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 8
      yPos -= 30;
      page2.drawText(`Article 8 - Résiliation`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page2.drawText(`En cas de manquement par l'une des parties à l'une quelconque de ses obligations, l'autre partie`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page2.drawText(`pourra résilier le présent contrat après mise en demeure restée sans effet pendant 15 jours.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 9
      yPos -= 30;
      page2.drawText(`Article 9 - Litiges`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page2.drawText(`En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 15;
      page2.drawText(`s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux de Liège.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Article 10
      yPos -= 30;
      page2.drawText(`Article 10 - Droit applicable`, {
        x: 50,
        y: yPos,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page2.drawText(`Le présent contrat est soumis au droit belge.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Date et signatures
      yPos -= 60;
      page2.drawText(`Fait à ${companyInfo.ville}, le ${dateGeneration}, en deux exemplaires originaux.`, {
        x: 50,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Zone de signatures
      yPos -= 40;
      page2.drawText(`Pour l'Entrepreneur principal`, {
        x: 100,
        y: yPos,
        size: 10,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      page2.drawText(`Pour le Sous-traitant`, {
        x: 350,
        y: yPos,
        size: 10,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      yPos -= 20;
      page2.drawText(`Maccio Grégory`, {
        x: 100,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      page2.drawText(`${soustraitant.contact || soustraitant.nom}`, {
        x: 350,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      // Ajouter la signature si elle existe
      if (signatureBuffer) {
        const signatureImagePrincipal = await pdfDoc.embedPng(signatureBuffer)
        const signatureSizePrincipal = signatureImagePrincipal.scale(0.12) // Réduire davantage la taille de la signature
        
        page2.drawImage(signatureImagePrincipal, {
          x: 100,
          y: yPos - 40, // Remonter la position pour éviter le débordement
          width: signatureSizePrincipal.width,
          height: signatureSizePrincipal.height,
        })
      }
    }
    
    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save()
    await writeFile(filePath, pdfBytes)
    
    console.log('PDF généré avec succès:', filePath)
    
    // URL relative du fichier
    const fileUrl = `/uploads/documents/soustraitants/${soustraitantFolder}/${fileName}`
    
    // Créer l'entrée du contrat dans la base de données
    const contrat = await (prisma as any).contrat.create({
      data: {
        soustraitantId: soustraitantId,
        url: fileUrl,
        token: token,
        estSigne: false,
        dateGeneration: new Date()
      }
    })
    
    return fileUrl
  } catch (error) {
    console.error("Erreur détaillée lors de la génération du contrat de sous-traitance:", error)
    console.error("Trace d'erreur:", error instanceof Error ? error.stack : "Pas de stack trace disponible")
    throw error
  }
}

/**
 * Signe un contrat de sous-traitance
 * @param token Token unique du contrat
 * @param signatureBase64 Signature du sous-traitant en base64
 * @returns L'URL du contrat signé
 */
export async function signerContrat(token: string, signatureBase64: string): Promise<string> {
  try {
    // Récupérer le contrat à partir du token
    const contrat = await (prisma as any).contrat.findUnique({
      where: { token },
      include: { soustraitant: true }
    })
    
    if (!contrat) {
      throw new Error('Contrat non trouvé')
    }
    
    if (contrat.estSigne) {
      throw new Error('Ce contrat a déjà été signé')
    }
    
    // Récupérer les informations de l'entreprise
    const companyInfo = await getCompanyInfo();
    
    // Extraire le dossier de l'URL existante
    const urlParts = contrat.url.split('/')
    const folderName = urlParts[urlParts.length - 2]
    
    // Charger le PDF existant
    const pdfPath = join(process.cwd(), 'public', contrat.url)
    const pdfBytes = await readFile(pdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    // Décoder la signature base64
    const signatureImageBytes = Buffer.from(signatureBase64, 'base64')
    
    // Incorporer la signature dans le document
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
    
    // Récupérer la dernière page (pour les signatures)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    
    // Dessiner la signature du sous-traitant
    const signatureSize = signatureImage.scale(0.12) // Réduire davantage la taille de la signature
    lastPage.drawImage(signatureImage, {
      x: 350,
      y: 200, // Position plus haute pour éviter le débordement
      width: signatureSize.width,
      height: signatureSize.height,
    })
    
    // Chemin pour le nouveau PDF
    const fileName = `Contrat-${contrat.soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}-signe.pdf`
    const filePath = join(DOCUMENTS_BASE_PATH, 'soustraitants', folderName, fileName)
    
    // Sauvegarder le PDF modifié
    const signedPdfBytes = await pdfDoc.save()
    await writeFile(filePath, signedPdfBytes)
    
    // URL relative du fichier
    const fileUrl = `/uploads/documents/soustraitants/${folderName}/${fileName}`
    
    // Mettre à jour le contrat dans la base de données
    await (prisma as any).contrat.update({
      where: { id: contrat.id },
      data: {
        url: fileUrl,
        estSigne: true,
        dateSignature: new Date(),
        token: null // Invalider le token après signature
      }
    })
    
    return fileUrl
  } catch (error) {
    console.error("Erreur lors de la signature du contrat:", error)
    throw error
  }
} 