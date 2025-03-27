import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'

// Fonction pour déterminer le chemin racine approprié en fonction du chemin du document
function getRootPath(filePath: string): string {
  const publicDir = path.join(process.cwd(), 'public');
  
  if (filePath.startsWith('/fiches-techniques/')) {
    return path.join(publicDir);
  } else if (filePath.startsWith('/chantiers/')) {
    return path.join(publicDir);
  } else {
    // Chemin par défaut pour la rétrocompatibilité
    return path.join(publicDir, 'fiches-techniques');
  }
}

// Fonction pour s'assurer que le chemin est dans le dossier racine
function validateAndGetFullPath(relativePath: string): string | null {
  // Normaliser le chemin relatif
  const normalizedPath = path.normalize(relativePath).replace(/\\/g, '/')
  
  // Vérifier si le chemin tente de sortir du dossier racine
  if (normalizedPath.includes('..')) {
    return null
  }
  
  // Déterminer le chemin racine approprié
  const rootPath = getRootPath(normalizedPath)
  
  // Créer le chemin complet
  const fullPath = path.join(rootPath, normalizedPath)
  
  // Vérifier si le chemin final est bien dans le dossier public
  const publicDir = path.join(process.cwd(), 'public')
  if (!fullPath.startsWith(publicDir)) {
    return null
  }
  
  return fullPath
}

// Fonction pour obtenir le type MIME basé sur l'extension
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le chemin du fichier à télécharger
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Chemin du fichier manquant' },
        { status: 400 }
      )
    }
    
    console.log(`Tentative de téléchargement du fichier: ${filePath}`);
    
    const fullPath = validateAndGetFullPath(filePath)
    if (!fullPath) {
      console.error(`Chemin invalide: ${filePath}`);
      return NextResponse.json(
        { error: 'Chemin invalide' },
        { status: 400 }
      )
    }
    
    console.log(`Chemin complet du fichier: ${fullPath}`);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      console.error(`Fichier non trouvé: ${fullPath}`);
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier que c'est bien un fichier
    const stats = fs.statSync(fullPath)
    if (!stats.isFile()) {
      console.error(`L'élément n'est pas un fichier: ${fullPath}`);
      return NextResponse.json(
        { error: 'L\'élément n\'est pas un fichier' },
        { status: 400 }
      )
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME
    const mimeType = getMimeType(fullPath)
    const fileName = path.basename(fullPath)
    
    console.log(`Téléchargement réussi: ${fileName}, type: ${mimeType}, taille: ${fileBuffer.length}`);
    
    // Retourner le fichier pour téléchargement
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du fichier' },
      { status: 500 }
    )
  }
} 