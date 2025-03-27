import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Supprimer toutes les tâches administratives
    await prisma.adminTask.deleteMany()
    console.log('✅ Toutes les tâches administratives ont été supprimées')

    // Supprimer toutes les tâches
    await prisma.tache.deleteMany()
    console.log('✅ Toutes les tâches ont été supprimées')

    // Vérifier que les tables sont vides
    const adminTaskCount = await prisma.adminTask.count()
    const tacheCount = await prisma.tache.count()

    console.log('\n=== État final ===')
    console.log('AdminTasks:', adminTaskCount)
    console.log('Taches:', tacheCount)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 