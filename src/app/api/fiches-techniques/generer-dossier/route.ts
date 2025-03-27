import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma/client'

// Fonction pour trouver un fichier PDF dans un dossier et ses sous-dossiers
async function findPdfFile(baseDir: string, fileName: string): Promise<string | null> {
  console.log(`Recherche de fichier: ${fileName} dans ${baseDir}`)
  
  try {
    const files = await fs.promises.readdir(baseDir)
    
    for (const file of files) {
      const fullPath = path.join(baseDir, file)
      const stat = await fs.promises.stat(fullPath)
      
      if (stat.isDirectory()) {
        console.log(`Exploration du sous-dossier: ${file}`)
        const found = await findPdfFile(fullPath, fileName)
        if (found) return found
      } else if (file.toLowerCase().endsWith('.pdf')) {
        // Normaliser les noms pour la comparaison
        const normalizedFile = file.toLowerCase().replace(/[_\-\s]/g, '').replace('.pdf', '')
        const normalizedFileName = fileName.toLowerCase().replace(/[_\-\s]/g, '')
        
        console.log(`Comparaison: ${normalizedFile} avec ${normalizedFileName}`)
        
        if (normalizedFile === normalizedFileName || normalizedFile.includes(normalizedFileName) || normalizedFileName.includes(normalizedFile)) {
          console.log(`Fichier trouvé: ${fullPath}`)
          return fullPath
        }
      }
    }
    
    console.log(`Aucun fichier correspondant à ${fileName} trouvé dans ${baseDir}`)
    return null
  } catch (error) {
    console.error(`Erreur lors de la recherche de fichier dans ${baseDir}:`, error)
    return null
  }
}

// Fonction pour ajouter un pied de page à une page
function addFooter(page: PDFPage, font: PDFFont, width: number, height: number, settings: any) {
  const footerText = `${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}`
  const footerWidth = font.widthOfTextAtSize(footerText, 10)
  
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 30,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4)
  })
}

// Fonction pour ajouter un en-tête à une page
function addHeader(page: PDFPage, font: PDFFont, width: number, height: number, text: string) {
  const headerText = text
  const headerWidth = font.widthOfTextAtSize(headerText, 12)
  
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: height - 30,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4)
  })
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, ficheIds, options } = await request.json()
    console.log('Fiches techniques sélectionnées:', ficheIds)

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 })
    }

    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create()

    // Charger la police Helvetica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Charger le logo
    let logoImage
    if (settings.logo) {
      const logoPath = path.join(process.cwd(), 'public', settings.logo)
      if (fs.existsSync(logoPath)) {
        const logoBytes = await fs.promises.readFile(logoPath)
        logoImage = await pdfDoc.embedPng(logoBytes)
      }
    }

    // Ajouter la page de garde
    const pageDeGarde = pdfDoc.addPage()
    const { width, height } = pageDeGarde.getSize()
    
    // Dessiner un rectangle en arrière-plan
    pageDeGarde.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.95, 0.95, 0.95)
    })

    // Ajouter le logo
    if (logoImage) {
      const logoWidth = 150
      const logoHeight = (logoImage.height * logoWidth) / logoImage.width
      pageDeGarde.drawImage(logoImage, {
        x: (width - logoWidth) / 2,
        y: height - 150,
        width: logoWidth,
        height: logoHeight
      })
    }

    // Nom de l'entreprise
    pageDeGarde.drawText(settings.name, {
      x: 50,
      y: height - 300,
      size: 28,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // Titre principal
    pageDeGarde.drawText('DOSSIER TECHNIQUE', {
      x: 50,
      y: height - 350,
      size: 32,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // Informations du chantier
    const infoY = height - 450
    pageDeGarde.drawText('Informations du chantier', {
      x: 50,
      y: infoY,
      size: 18,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    const infoStartY = infoY - 40
    const lineHeight = 25
    const infoTexts = [
      `Nom du chantier : ${chantier.nomChantier}`,
      `Client : ${chantier.clientNom}`,
      `Adresse : ${chantier.adresseChantier}`,
      `Date de début : ${new Date(chantier.dateCommencement).toLocaleDateString('fr-FR')}`,
      `Date de génération : ${new Date().toLocaleDateString('fr-FR')}`
    ]

    infoTexts.forEach((text, index) => {
      pageDeGarde.drawText(text, {
        x: 70,
        y: infoStartY - (index * lineHeight),
        size: 12,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      })
    })

    // Ajouter le pied de page avec les informations de l'entreprise
    const footerText = `${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}`
    const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 10)
    pageDeGarde.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 30,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4)
    })

    // Ajouter la table des matières si demandé
    if (options.includeTableOfContents) {
      const tableDesMatieres = pdfDoc.addPage()
      const { width, height } = tableDesMatieres.getSize()
      
      // Titre de la table des matières
      tableDesMatieres.drawText('TABLE DES MATIÈRES', {
        x: 50,
        y: height - 100,
        size: 24,
        font: helveticaBoldFont,
        color: rgb(0.2, 0.2, 0.2)
      })

      // Liste des fiches techniques avec points de suite
      let currentY = height - 150
      const lineHeight = 20
      const pageNumberX = width - 50
      let pageNumber = 3
      
      for (const ficheId of ficheIds) {
        const fichePath = await findPdfFile(path.join(process.cwd(), 'public', 'fiches-techniques', 'Produits Technique'), ficheId)
        if (fichePath) {
          const ficheName = path.basename(fichePath, '.pdf')
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')

          // Dessiner le titre
          tableDesMatieres.drawText(ficheName, {
            x: 70,
            y: currentY,
            size: 12,
            font: helveticaFont,
            color: rgb(0.4, 0.4, 0.4)
          })

          // Dessiner les points de suite
          const titleWidth = helveticaFont.widthOfTextAtSize(ficheName, 12)
          const dotsStartX = 70 + titleWidth + 10
          const dotsEndX = pageNumberX - 30
          const dotsCount = Math.floor((dotsEndX - dotsStartX) / 5)
          
          for (let i = 0; i < dotsCount; i++) {
            tableDesMatieres.drawText('.', {
              x: dotsStartX + (i * 5),
              y: currentY,
              size: 12,
              font: helveticaFont,
              color: rgb(0.4, 0.4, 0.4)
            })
          }

          // Dessiner le numéro de page
          tableDesMatieres.drawText(pageNumber.toString(), {
            x: pageNumberX,
            y: currentY,
            size: 12,
            font: helveticaFont,
            color: rgb(0.4, 0.4, 0.4)
          })

          currentY -= lineHeight
          pageNumber++
        }
      }

      // Ajouter le pied de page
      addFooter(tableDesMatieres, helveticaFont, width, height, settings)
    }

    // Ajouter les fiches techniques
    const baseDir = path.join(process.cwd(), 'public', 'fiches-techniques', 'Produits Technique')
    console.log('Dossier de base pour la recherche:', baseDir)

    for (const ficheId of ficheIds) {
      console.log('Recherche du fichier:', ficheId)
      const fichePath = await findPdfFile(baseDir, ficheId)
      
      if (fichePath) {
        console.log('Fichier trouvé:', fichePath)
        const ficheBytes = await fs.promises.readFile(fichePath)
        console.log('Taille du fichier lu:', ficheBytes.length)
        const fichePdf = await PDFDocument.load(ficheBytes)
        console.log('Nombre de pages dans le PDF:', fichePdf.getPageCount())
        
        // Ajouter une page d'en-tête pour la fiche technique
        const headerPage = pdfDoc.addPage()
        const { width, height } = headerPage.getSize()
        
        // Titre de la fiche technique
        const ficheName = path.basename(fichePath, '.pdf')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        headerPage.drawText(ficheName, {
          x: 50,
          y: height - 100,
          size: 24,
          font: helveticaBoldFont,
          color: rgb(0.2, 0.2, 0.2)
        })

        // Ajouter l'en-tête et le pied de page
        addHeader(headerPage, helveticaFont, width, height, ficheName)
        addFooter(headerPage, helveticaFont, width, height, settings)

        // Copier les pages de la fiche technique
        const pages = await pdfDoc.copyPages(fichePdf, fichePdf.getPageIndices())
        pages.forEach(page => {
          const { width, height } = page.getSize()
          // Ajouter l'en-tête et le pied de page à chaque page
          addHeader(page, helveticaFont, width, height, ficheName)
          addFooter(page, helveticaFont, width, height, settings)
          pdfDoc.addPage(page)
        })
        
        console.log('Fichier ajouté avec succès')
      } else {
        console.error('Fichier non trouvé:', ficheId)
        const baseDirContent = await fs.promises.readdir(baseDir)
        console.log('Contenu du dossier de base:', baseDirContent)
      }
    }

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save()

    // Créer le dossier Documents du chantier s'il n'existe pas
    const chantierDir = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!fs.existsSync(chantierDir)) {
      fs.mkdirSync(chantierDir, { recursive: true })
    }

    // Sauvegarder le fichier
    const fileName = `dossier-technique-${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(chantierDir, fileName)
    await fs.promises.writeFile(filePath, pdfBytes)

    // Créer l'entrée dans la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    await prisma.document.create({
      data: {
        nom: `Dossier technique - ${new Date().toLocaleDateString('fr-FR')} - ${ficheIds.length} fiches`,
        type: 'DOSSIER_TECHNIQUE',
        url: `/chantiers/${chantierId}/documents/${fileName}`,
        taille: pdfBytes.length,
        mimeType: 'application/pdf',
        updatedAt: new Date(),
        chantier: {
          connect: {
            chantierId: chantierId
          }
        },
        user: {
          connect: {
            id: user.id
          }
        }
      }
    })

    // Retourner le PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du dossier' },
      { status: 500 }
    )
  }
} 