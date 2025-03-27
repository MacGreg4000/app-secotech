import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const chantierId = "CH1739211266824"
  
  // Créer uniquement des tâches administratives de test
  const tasks = [
    {
      title: "Vérification des documents administratifs",
      description: "Vérifier que tous les documents requis sont présents",
      status: "pending",
      priority: "high",
      chantierId: chantierId
    },
    {
      title: "Validation du devis",
      description: "Faire valider le devis par le client",
      status: "pending",
      priority: "medium",
      chantierId: chantierId
    }
  ]

  // Ajouter uniquement les nouvelles tâches sans toucher au reste
  for (const task of tasks) {
    await prisma.adminTask.create({
      data: task
    })
  }

  console.log('Tâches administratives de test créées avec succès')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 