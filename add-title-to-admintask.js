const mysql = require('mysql2/promise');

async function addTitleToAdminTask() {
  console.log('Ajout de la colonne title à la table AdminTask...');
  
  try {
    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'appsecotech'
    });
    
    console.log('Connexion à la base de données réussie');
    
    // Vérifier si la colonne title existe déjà
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'appsecotech' 
      AND TABLE_NAME = 'AdminTask' 
      AND COLUMN_NAME = 'title'
    `);
    
    if (columns.length > 0) {
      console.log('La colonne title existe déjà dans la table AdminTask');
    } else {
      // Ajouter la colonne title
      console.log('Ajout de la colonne title...');
      await connection.execute(`
        ALTER TABLE AdminTask 
        ADD COLUMN title VARCHAR(255) NULL
      `);
      console.log('Colonne title ajoutée avec succès');
    }
    
    // Vérifier la structure mise à jour
    const [adminTaskStructure] = await connection.execute('DESCRIBE AdminTask');
    console.log('\nStructure mise à jour de la table AdminTask:');
    adminTaskStructure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type}, ${column.Key}, ${column.Extra}`);
    });
    
    // Fermer la connexion
    await connection.end();
    
    console.log('\nModification de la table AdminTask terminée avec succès!');
    
    return true;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Exécuter la fonction
addTitleToAdminTask(); 