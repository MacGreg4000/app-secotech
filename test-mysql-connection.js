const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Test de connexion à MySQL...');
  
  try {
    // Créer une connexion avec mot de passe vide
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Mot de passe vide
      database: 'appsecotech'
    });
    
    console.log('Connexion réussie!');
    
    // Tester une requête simple
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Requête test réussie:', rows);
    
    // Fermer la connexion
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
    
    // Si l'erreur est liée à l'authentification, essayons avec d'autres mots de passe courants
    if (error.message.includes('Access denied') || error.message.includes('Authentication failed')) {
      console.log('\nEssai avec d\'autres mots de passe courants...');
      
      const commonPasswords = ['root', 'password', 'mysql', '1234', 'admin'];
      
      for (const pwd of commonPasswords) {
        try {
          console.log(`Essai avec le mot de passe: "${pwd}"`);
          const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: pwd,
            database: 'appsecotech'
          });
          
          console.log(`Connexion réussie avec le mot de passe: "${pwd}"`);
          console.log(`Veuillez mettre à jour vos fichiers .env avec: DATABASE_URL="mysql://root:${pwd}@localhost:3306/appsecotech"`);
          
          await conn.end();
          return true;
        } catch (err) {
          console.log(`Échec avec le mot de passe: "${pwd}"`);
        }
      }
    }
    
    return false;
  }
}

// Exécuter le test
testConnection()
  .then(success => {
    if (!success) {
      console.log('\nSuggestions:');
      console.log('1. Vérifiez que le serveur MySQL est en cours d\'exécution');
      console.log('2. Vérifiez les identifiants de connexion dans phpMyAdmin');
      console.log('3. Essayez de créer un nouvel utilisateur MySQL avec des privilèges complets');
    }
  }); 