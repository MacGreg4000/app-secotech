import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestChantier() {
  try {
    // Vérifier si un chantier existe déjà
    const existingChantier = await prisma.chantier.findFirst()
    
    if (existingChantier) {
      console.log('Un chantier existe déjà:')
      console.log('ID:', existingChantier.chantierId)
      console.log('Nom:', existingChantier.nomChantier)
      return
    }

    // Générer un ID unique pour le chantier
    const chantierId = `CH${Date.now()}`
    
    // Créer le chantier de test
    const chantier = await prisma.chantier.create({
      data: {
        chantierId,
        nomChantier: 'Chantier de test',
        dateCommencement: new Date(),
        etatChantier: 'En préparation',
        montantTotal: 0,
        updatedAt: new Date()
      }
    })

    console.log('Chantier de test créé avec succès:')
    console.log('ID:', chantier.chantierId)
    console.log('Nom:', chantier.nomChantier)

  } catch (error) {
    console.error('Erreur lors de la création du chantier de test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestChantier() 