const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Initialisation de la base de données...')
    
    // Vérifier la connexion
    await prisma.$connect()
    console.log('Connexion à la base de données réussie')
    
    // Créer un utilisateur admin par défaut
    const hashedPassword = require('bcrypt').hashSync('Secotech2024!', 12)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@secotech.fr',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN'
      }
    })
    
    console.log('Utilisateur admin créé avec succès:')
    console.log('Email:', admin.email)
    console.log('Mot de passe: Secotech2024!')
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 