const mysql = require('mysql2/promise');

async function checkUserTable() {
  console.log('Vérification de la structure de la table user...');
  
  try {
    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'appsecotech'
    });
    
    console.log('Connexion à la base de données réussie');
    
    // Lister toutes les tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\nTables dans la base de données:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Vérifier la structure de la table user
    const [userStructure] = await connection.execute('DESCRIBE user');
    console.log('\nStructure de la table user:');
    userStructure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type}, ${column.Key}, ${column.Extra}`);
    });
    
    // Vérifier les clés primaires
    const [primaryKeys] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'appsecotech'
      AND TABLE_NAME = 'user'
      AND CONSTRAINT_NAME = 'PRIMARY'
    `);
    
    console.log('\nClés primaires de la table user:');
    primaryKeys.forEach(key => {
      console.log(`- ${key.COLUMN_NAME}`);
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
checkUserTable(); 