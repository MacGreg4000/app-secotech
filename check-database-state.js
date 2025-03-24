const mysql = require('mysql2/promise');

async function checkDatabaseState() {
  console.log('Vérification de l\'état de la base de données...');
  
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
    
    // Vérifier si la table User existe
    const userTableExists = tables.some(table => Object.values(table)[0] === 'User');
    
    if (userTableExists) {
      // Vérifier la structure de la table User
      console.log('\nStructure de la table User:');
      const [columns] = await connection.execute('DESCRIBE User');
      columns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
      // Vérifier les utilisateurs existants
      const [users] = await connection.execute('SELECT id, name, email, role FROM User');
      console.log('\nUtilisateurs existants:');
      if (users.length === 0) {
        console.log('Aucun utilisateur trouvé');
      } else {
        users.forEach(user => {
          console.log(`- ID: ${user.id}, Nom: ${user.name}, Email: ${user.email}, Rôle: ${user.role}`);
        });
      }
    } else {
      console.log('\nLa table User n\'existe pas');
    }
    
    // Vérifier les tables liées à NextAuth
    const nextAuthTables = ['Account', 'Session', 'VerificationToken'];
    console.log('\nTables NextAuth:');
    for (const tableName of nextAuthTables) {
      const exists = tables.some(table => Object.values(table)[0] === tableName);
      console.log(`- ${tableName}: ${exists ? 'Existe' : 'N\'existe pas'}`);
    }
    
    // Fermer la connexion
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Exécuter la fonction
checkDatabaseState(); 