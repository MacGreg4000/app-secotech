import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import puppeteer from 'puppeteer'
import { prisma } from '@/lib/prisma/client'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import crypto from 'crypto'
import { generateContratSoustraitance as generatePdfLibContrat, signerContrat as signerPdfLibContrat } from './contrat-generator-pdf-lib'

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
  // Rediriger vers la version pdf-lib qui fonctionne sans Puppeteer
  return generatePdfLibContrat(soustraitantId, userId);
}

/**
 * Signe un contrat de sous-traitance
 * @param token Token unique du contrat
 * @param signatureBase64 Signature du sous-traitant en base64
 * @returns L'URL du contrat signé
 */
export async function signerContrat(token: string, signatureBase64: string): Promise<string> {
  // Rediriger vers la version pdf-lib qui fonctionne sans Puppeteer
  return signerPdfLibContrat(token, signatureBase64);
} 