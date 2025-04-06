import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

interface FicheTechnique {
  id: string
  titre: string
  categorie: string
  sousCategorie?: string | null
  fichierUrl: string
  description?: string | null
  referenceCC?: string | null
}

interface Dossier {
  nom: string
  chemin: string
  sousDossiers: Dossier[]
  fiches: FicheTechnique[]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const baseDir = path.join(process.cwd(), 'public', 'fiches-techniques')
    const structure = scanDirectory(baseDir)

    return NextResponse.json(structure)
  } catch (error) {
    console.error('Erreur lors de la lecture de la structure:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la lecture de la structure des dossiers' },
      { status: 500 }
    )
  }
}

function scanDirectory(dir: string): Dossier[] {
  const items = fs.readdirSync(dir)
  const structure: Dossier[] = []

  items.forEach(item => {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath)

    if (stat.isDirectory()) {
      // C'est un dossier
      const sousDossiers = scanDirectory(fullPath)
      structure.push({
        nom: item,
        chemin: relativePath,
        sousDossiers,
        fiches: []
      })
    } else if (item.endsWith('.pdf')) {
      // C'est une fiche technique
      const parentDir = path.basename(dir)
      const grandParentDir = path.basename(path.dirname(dir))
      
      structure.push({
        nom: parentDir,
        chemin: path.dirname(relativePath),
        sousDossiers: [],
        fiches: [{
          id: path.parse(item).name,
          titre: path.parse(item).name,
          categorie: grandParentDir,
          sousCategorie: parentDir,
          fichierUrl: relativePath,
          description: null
        }]
      })
    }
  })

  return structure
} 