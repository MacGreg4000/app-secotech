import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import puppeteer from 'puppeteer'
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
    // Récupérer les données du sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })
    
    if (!soustraitant) {
      throw new Error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`)
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
    const templatePath = join(process.cwd(), 'templates', 'contrat-sous-traitant.html')
    console.log('Chemin du template:', templatePath)
    
    let template = await readFile(templatePath, 'utf-8')
    console.log('Taille du template HTML:', template.length)
    
    // Date de génération formatée
    const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr })
    
    // Générer un token unique pour la signature électronique
    const token = crypto.randomBytes(32).toString('hex')
    
    // Remplacer les placeholders par les données du sous-traitant et de l'entreprise
    template = template
      // Informations du sous-traitant
      .replace(/{{nomSousTraitant}}/g, soustraitant.nom)
      .replace(/{{adresseSousTraitant}}/g, soustraitant.adresse || 'Adresse non spécifiée')
      .replace(/{{tvaSousTraitant}}/g, (soustraitant as any).tva || 'Non spécifié')
      .replace(/{{telephoneSousTraitant}}/g, soustraitant.telephone || 'Non spécifié')
      .replace(/{{emailSousTraitant}}/g, soustraitant.email || 'Non spécifié')
      .replace(/{{representantSousTraitant}}/g, soustraitant.contact || soustraitant.nom)
      
      // Informations de l'entreprise
      .replace(/{{nomEntreprise}}/g, companyInfo.nom)
      .replace(/{{adresseEntreprise}}/g, companyInfo.adresse)
      .replace(/{{villeEntreprise}}/g, companyInfo.ville || 'Barchon')
      .replace(/{{telephoneEntreprise}}/g, companyInfo.telephone)
      .replace(/{{emailEntreprise}}/g, companyInfo.email)
      .replace(/{{tvaEntreprise}}/g, companyInfo.tva)
      .replace(/{{representantEntreprise}}/g, 'Maccio Grégory')
      
      // Dates du contrat
      .replace(/{{dateDebut}}/g, format(new Date(), 'dd/MM/yyyy'))
      .replace(/{{dateFin}}/g, format(addYears(new Date(), 1), 'dd/MM/yyyy'))
      
      // Date de génération
      .replace(/{{dateGeneration}}/g, dateGeneration)
      
      // Logo et signature
      .replace(/{{logoBase64}}/g, logoBase64)
      .replace(/{{signatureBase64}}/g, signatureBase64);
    
    // Créer le dossier pour le sous-traitant s'il n'existe pas
    const soustraitantDir = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantId)
    await mkdir(soustraitantDir, { recursive: true })
    
    // Nom du fichier PDF
    const fileName = `Contrat-${soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}.pdf`
    const filePath = join(soustraitantDir, fileName)
    
    // Écrire le HTML dans un fichier temporaire pour déboguer
    const tempHtmlPath = join(soustraitantDir, 'temp.html')
    await writeFile(tempHtmlPath, template, 'utf-8')
    console.log('Fichier HTML temporaire créé:', tempHtmlPath)
    
    try {
      // Générer le PDF à partir du HTML
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      await page.setContent(template, { waitUntil: 'networkidle0' })
      
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
      
      console.log('PDF généré avec succès:', filePath)
      
      // Obtenir la taille du fichier
      const fileStats = await stat(filePath)
      const fileSize = fileStats.size
      
      // URL relative du fichier
      const fileUrl = `/uploads/documents/soustraitants/${soustraitantId}/${fileName}`
      
      // Créer ou mettre à jour l'entrée du contrat dans la base de données
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
      console.error("Erreur lors de la génération du contrat de sous-traitance:", error)
      throw error
    }
  } catch (error) {
    console.error("Erreur lors de la génération du contrat de sous-traitance:", error)
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
    
    // Récupérer le logo de l'entreprise
    let logoBase64 = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoBase64 = logoBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture du logo:', error)
    }
    
    // Récupérer l'image de la signature de l'entreprise
    let signatureEntrepriseBase64 = ''
    try {
      const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
      const signatureBuffer = await readFile(signaturePath)
      signatureEntrepriseBase64 = signatureBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture de la signature:', error)
    }
    
    // Lire le template HTML
    const templatePath = join(process.cwd(), 'templates', 'contrat-sous-traitant.html')
    let template = await readFile(templatePath, 'utf-8')
    
    // Date de génération formatée
    const dateGeneration = format(new Date(contrat.dateGeneration), 'dd/MM/yyyy', { locale: fr })
    const dateSignature = format(new Date(), 'dd/MM/yyyy', { locale: fr })
    
    // Remplacer les placeholders par les données du sous-traitant et de l'entreprise
    template = template
      // Informations du sous-traitant
      .replace(/{{nomSousTraitant}}/g, contrat.soustraitant.nom)
      .replace(/{{adresseSousTraitant}}/g, contrat.soustraitant.adresse || 'Adresse non spécifiée')
      .replace(/{{tvaSousTraitant}}/g, 'Non spécifié')
      .replace(/{{telephoneSousTraitant}}/g, contrat.soustraitant.telephone || 'Non spécifié')
      .replace(/{{emailSousTraitant}}/g, contrat.soustraitant.email)
      .replace(/{{contactSousTraitant}}/g, contrat.soustraitant.contact || contrat.soustraitant.nom)
      .replace(/{{representantSousTraitant}}/g, contrat.soustraitant.contact || contrat.soustraitant.nom)
      
      // Informations de l'entreprise
      .replace(/{{nomEntreprise}}/g, companyInfo.nom)
      .replace(/{{adresseEntreprise}}/g, companyInfo.adresse)
      .replace(/{{villeEntreprise}}/g, companyInfo.ville)
      .replace(/{{telephoneEntreprise}}/g, companyInfo.telephone)
      .replace(/{{emailEntreprise}}/g, companyInfo.email)
      .replace(/{{tvaEntreprise}}/g, companyInfo.tva)
      .replace(/{{representantEntreprise}}/g, 'Maccio Grégory')
      
      // Dates du contrat
      .replace(/{{dateDebut}}/g, format(new Date(), 'dd/MM/yyyy'))
      .replace(/{{dateFin}}/g, format(addYears(new Date(), 1), 'dd/MM/yyyy'))
      
      // Date de génération
      .replace(/{{dateGeneration}}/g, dateGeneration)
      
      // Logo et signatures
      .replace(/{{logoBase64}}/g, logoBase64)
      .replace(/{{signatureBase64}}/g, signatureEntrepriseBase64)
      .replace(/{{signatureSousTraitantBase64}}/g, signatureBase64)
      
      // État de signature
      .replace(/{{#if estSigne}}/g, '')
      .replace(/{{else}}/g, '<!--')
      .replace(/{{\/if}}/g, '-->')
    
    // Créer le dossier pour le sous-traitant s'il n'existe pas
    const soustraitantDir = join(DOCUMENTS_BASE_PATH, 'soustraitants', contrat.soustraitantId)
    await mkdir(soustraitantDir, { recursive: true })
    
    // Nom du fichier PDF
    const fileName = `Contrat-${contrat.soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}-signe.pdf`
    const filePath = join(soustraitantDir, fileName)
    
    // Générer le PDF à partir du HTML
    const browser = await puppeteer.launch({
      headless: true, // Utiliser le mode headless standard
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] // Options de sécurité pour les environnements serveur
    })
    const page = await browser.newPage()
    await page.setContent(template)
    
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
    
    // URL relative du fichier
    const fileUrl = `/uploads/documents/soustraitants/${contrat.soustraitantId}/${fileName}`
    
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