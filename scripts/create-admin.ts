import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const adminData = {
      email: 'gregory@secotech.be',
      name: 'Gregory',
      password: 'Secotech2023!',
      role: 'ADMIN'
    }

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email }
    })

    if (existingAdmin) {
      console.log('Un administrateur avec cet email existe déjà')
      return
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    // Créer l'administrateur
    const admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: adminData.email,
        name: adminData.name,
        password: hashedPassword,
        role: 'ADMIN',
        updatedAt: new Date()
      }
    })

    console.log('Administrateur créé avec succès:')
    console.log('Email:', admin.email)
    console.log('Mot de passe:', adminData.password)
    console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!')

  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin() 