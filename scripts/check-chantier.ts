import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const chantier = await prisma.chantier.findFirst({
    select: {
      chantierId: true,
      nomChantier: true
    }
  })
  console.log('Premier chantier trouvé:', chantier)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 