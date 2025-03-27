import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Vérifier les chantiers
  console.log('\n=== Chantiers ===')
  const chantiers = await prisma.chantier.findMany({
    select: {
      id: true,
      chantierId: true,
      nomChantier: true
    }
  })
  console.log('Chantiers trouvés:', chantiers)

  // Vérifier les tâches administratives existantes
  console.log('\n=== Tâches administratives ===')
  const adminTasks = await prisma.adminTask.findMany()
  console.log('Tâches administratives trouvées:', adminTasks)

  // Vérifier les contraintes uniques
  console.log('\n=== Vérification des doublons potentiels ===')
  const duplicates = await prisma.$queryRaw`
    SELECT chantierId, taskType, COUNT(*) as count 
    FROM AdminTask 
    GROUP BY chantierId, taskType 
    HAVING count > 1
  `
  console.log('Doublons trouvés:', duplicates)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 