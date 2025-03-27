import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  try {
    // Nettoyer la base de données
    await prisma.user.deleteMany()
    await prisma.chantier.deleteMany()

    // Créer l'utilisateur admin
    const hashedPassword = await hash('Secotech2024!', 12)
    const admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: 'admin@secotech.fr',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'ADMIN',
        updatedAt: new Date()
      }
    })

    console.log('Utilisateur admin créé:', admin)

    // Créer deux chantiers de test
    const chantier1 = await prisma.chantier.create({
      data: {
        chantierId: `CH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        nomChantier: "Construction Résidence Les Oliviers",
        dateCommencement: new Date('2024-03-01'),
        etatChantier: "En cours",
        clientNom: "SCI Les Oliviers",
        clientEmail: "contact@scilesoliviers.fr",
        clientAdresse: "15 rue des Oliviers, 13100 Aix-en-Provence",
        adresseChantier: "25 avenue de la République, 13100 Aix-en-Provence",
        montantTotal: 850000.00,
        updatedAt: new Date()
      }
    })

    const chantier2 = await prisma.chantier.create({
      data: {
        chantierId: `CH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        nomChantier: "Rénovation Immeuble Le Prado",
        dateCommencement: new Date('2024-04-15'),
        etatChantier: "En cours",
        clientNom: "Copropriété Le Prado",
        clientEmail: "syndic@leprado.fr",
        clientAdresse: "45 avenue du Prado, 13008 Marseille",
        adresseChantier: "45 avenue du Prado, 13008 Marseille",
        montantTotal: 350000.00,
        updatedAt: new Date()
      }
    })

    console.log('Chantiers de test créés:', { chantier1, chantier2 })

  } catch (error) {
    console.error('Erreur lors du seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 