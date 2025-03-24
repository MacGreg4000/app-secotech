import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function hashPassword() {
  try {
    // Remplacez par l'email de l'utilisateur que vous voulez mettre à jour
    const userEmail = 'votre.email@example.com'
    // Le nouveau mot de passe en clair
    const newPassword = 'nouveau_mot_de_passe'
    
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    await prisma.user.update({
      where: { email: userEmail },
      data: { password: hashedPassword }
    })
    
    console.log('Mot de passe mis à jour avec succès')
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

hashPassword() 