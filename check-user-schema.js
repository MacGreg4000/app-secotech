const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Récupérer le modèle User depuis Prisma
    const userModel = prisma._dmmf.datamodel.models.find(model => model.name === 'User');
    
    if (userModel) {
      console.log('Schéma de la table User:');
      console.log(JSON.stringify(userModel, null, 2));
      
      // Vérifier si des utilisateurs existent déjà
      const users = await prisma.user.findMany();
      console.log(`Nombre d'utilisateurs existants: ${users.length}`);
      
      if (users.length > 0) {
        console.log('Premier utilisateur (sans mot de passe):');
        const { password, ...userWithoutPassword } = users[0];
        console.log(userWithoutPassword);
      }
    } else {
      console.log('Modèle User non trouvé dans le schéma Prisma');
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 