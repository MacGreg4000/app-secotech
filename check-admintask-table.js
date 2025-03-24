const mysql = require('mysql2/promise');

async function checkAdminTaskTable() {
  console.log('Vérification de la structure de la table AdminTask...');
  
  try {
    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'appsecotech'
    });
    
    console.log('Connexion à la base de données réussie');
    
    // Vérifier la structure de la table AdminTask
    const [adminTaskStructure] = await connection.execute('DESCRIBE AdminTask');
    console.log('\nStructure de la table AdminTask:');
    adminTaskStructure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type}, ${column.Key}, ${column.Extra}`);
    });
    
    // Fermer la connexion
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Exécuter la fonction
checkAdminTaskTable(); 