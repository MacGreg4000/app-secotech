import { PrismaClient } from '@prisma/client'

// Déclaration pour étendre le client Prisma avec nos modèles
declare global {
  namespace PrismaJson {
    type PrismaClientWithExtensions = PrismaClient & {
      rack: any;
      emplacement: any;
      materiau: any;
    }
  }
}

// Créer une instance étendue du client Prisma
const prismaWithExtensions = new PrismaClient() as PrismaJson.PrismaClientWithExtensions

export { prismaWithExtensions } 