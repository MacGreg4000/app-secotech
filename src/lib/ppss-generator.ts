import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import puppeteer from 'puppeteer'
import { prisma } from '@/lib/prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
        telephone: '0032(0)498 32 49 49',
        email: 'info@secotech.be',
        tva: 'BE0537822042'
      };
    }
    
    return {
      nom: settings.name,
      adresse: `${settings.address}, ${settings.zipCode} ${settings.city}`,
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
      telephone: '0032(0)498 32 49 49',
      email: 'info@secotech.be',
      tva: 'BE0537822042'
    };
  }
}

// Interface pour les sous-traitants
interface Soustraitant {
  id: string;
  nom: string;
  poste?: string;
  contact?: string;
}

/**
 * Génère un Plan Particulier de Sécurité et de Santé (PPSS) pour un chantier
 * @param chantierId Identifiant du chantier
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns Le document créé dans la base de données
 */
export async function generatePPSS(chantierId: string, userId: string) {
  try {
    // Récupérer les données du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: { client: true }
    })
    
    if (!chantier) {
      throw new Error('Chantier non trouvé')
    }
    
    // Récupérer les informations de l'entreprise
    const companyInfo = await getCompanyInfo();
    
    // Récupérer le logo de l'entreprise
    let logoBase64 = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoBase64 = logoBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture du logo:', error)
      // Utiliser un logo par défaut ou laisser vide
    }
    
    // Récupérer l'image de la signature
    let signatureBase64 = ''
    try {
      const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
      const signatureBuffer = await readFile(signaturePath)
      signatureBase64 = signatureBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture de la signature:', error)
      // Continuer sans image de signature
    }
    
    // Lire le template HTML
    const templatePath = join(process.cwd(), 'templates', 'ppss-template.html')
    let template = await readFile(templatePath, 'utf-8')
    
    // Date de génération formatée
    const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr })
    
    // Remplacer les placeholders par les données du chantier et les valeurs par défaut
    template = template
      // Informations du chantier
      .replace(/{{chantierId}}/g, chantier.chantierId)
      .replace(/{{nomChantier}}/g, chantier.nomChantier)
      .replace(/{{adresseChantier}}/g, chantier.adresseChantier || '')
      .replace(/{{dateCommencement}}/g, chantier.dateDebut 
        ? format(new Date(chantier.dateDebut), 'MMMM yyyy', { locale: fr })
        : 'Non définie')
      
      // Informations de l'entreprise
      .replace(/{{nomEntreprise}}/g, companyInfo.nom)
      .replace(/{{adresseEntreprise}}/g, companyInfo.adresse)
      .replace(/{{telephoneEntreprise}}/g, companyInfo.telephone)
      .replace(/{{emailEntreprise}}/g, companyInfo.email)
      .replace(/{{tvaEntreprise}}/g, companyInfo.tva)
      
      // Date de génération
      .replace(/{{dateGeneration}}/g, dateGeneration)
      
      // Logo et signature
      .replace(/{{logoBase64}}/g, logoBase64)
      .replace(/{{signatureBase64}}/g, signatureBase64)
    
    // Créer le dossier pour le chantier s'il n'existe pas
    const chantierDir = join(DOCUMENTS_BASE_PATH, chantierId)
    await mkdir(chantierDir, { recursive: true })
    
    // Nom du fichier PDF
    const fileName = `PPSS-${chantier.chantierId}.pdf`
    const filePath = join(chantierDir, fileName)
    
    // Générer le PDF à partir du HTML
    const browser = await puppeteer.launch({
      headless: true, // Utiliser le mode headless standard
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Options de sécurité pour les environnements serveur
    })
    const page = await browser.newPage()
    await page.setContent(template)
    
    // Ajouter les numéros de page
    await page.evaluateHandle(() => {
      const elements = document.querySelectorAll('.pageNumber')
      elements.forEach((el, i) => {
        el.textContent = (i + 1).toString()
      })
    })
    
    // Générer le PDF
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    })
    await browser.close()
    
    // Obtenir la taille du fichier
    const fileStats = await readFile(filePath)
    const fileSize = fileStats.length
    
    // Vérifier si un document PPSS existe déjà pour ce chantier
    const existingDocument = await prisma.document.findFirst({
      where: {
        chantierId,
        type: 'PPSS'
      }
    })
    
    if (existingDocument) {
      // Mettre à jour le document existant
      const updatedDoc = await prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          updatedAt: new Date(),
          taille: fileSize
        }
      })
      return updatedDoc.url
    } else {
      // Créer une nouvelle entrée dans la base de données
      const newDoc = await prisma.document.create({
        data: {
          nom: fileName,
          type: 'PPSS',
          url: `/uploads/documents/${chantierId}/${fileName}`,
          taille: fileSize,
          mimeType: 'application/pdf',
          chantierId: chantierId,
          createdBy: userId,
          updatedAt: new Date()
        }
      })
      return newDoc.url
    }
  } catch (error) {
    console.error("Erreur lors de la génération du PPSS:", error)
    throw error
  }
} 