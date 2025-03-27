import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_TASKS = [
  {
    title: 'Déclaration de chantier',
    taskType: 'declaration_chantier',
    chantierId: 'CH1739211266824',
    completed: false,
    updatedAt: new Date()
  },
  {
    title: 'Cautionnement collectif',
    taskType: 'cautionnement_collectif',
    chantierId: 'CH1739211266824',
    completed: false,
    updatedAt: new Date()
  },
  {
    title: 'Déclaration de sous-traitance',
    taskType: 'declaration_sous_traitance',
    chantierId: 'CH1739211266824',
    completed: false,
    updatedAt: new Date()
  },
  {
    title: 'Fiche technique',
    taskType: 'fiche_technique',
    chantierId: 'CH1739211266824',
    completed: false,
    updatedAt: new Date()
  }
]

async function main() {
  try {
    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findFirst()
    
    if (!chantier) {
      throw new Error('Aucun chantier trouvé dans la base de données')
    }

    // Utiliser l'ID du chantier trouvé
    const chantierId = chantier.chantierId
    console.log('✅ Chantier trouvé:', chantierId)

    // Supprimer les tâches existantes pour ce chantier
    await prisma.admintask.deleteMany({
      where: { chantierId }
    })
    console.log('✅ Anciennes tâches supprimées')

    // Créer les nouvelles tâches avec l'ID du chantier
    for (const task of ADMIN_TASKS) {
      const newTask = {
        ...task,
        chantierId, // Utiliser l'ID du chantier trouvé
        updatedAt: new Date() // Assurer que updatedAt est toujours à jour
      }
      await prisma.admintask.create({
        data: newTask
      })
      console.log(`✅ Tâche créée: ${task.title}`)
    }

    // Vérifier les tâches créées
    const createdTasks = await prisma.admintask.findMany({
      where: { chantierId }
    })
    console.log('✅ Tâches créées:', createdTasks)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 