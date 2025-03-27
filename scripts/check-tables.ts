import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== État des tables ===')
  
  // Vérifier la table Note
  const notes = await prisma.note.count()
  console.log('Notes:', notes)
  
  // Vérifier la table Tache
  const taches = await prisma.tache.count()
  console.log('Taches:', taches)
  
  // Vérifier la table AdminTask
  const adminTasks = await prisma.admintask.count()
  console.log('AdminTasks:', adminTasks)

  // Vérifier la structure de AdminTask
  const adminTasksStructure = await prisma.$queryRaw`
    DESCRIBE AdminTask;
  `
  console.log('\nStructure de AdminTask:', adminTasksStructure)

  // Vérifier les contraintes
  const constraints = await prisma.$queryRaw`
    SELECT * 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME = 'AdminTask';
  `
  console.log('\nContraintes sur AdminTask:', constraints)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 