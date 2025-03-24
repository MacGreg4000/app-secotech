const mysql = require('mysql2/promise');

async function createNextAuthTables() {
  console.log('Création des tables NextAuth sans contraintes explicites...');
  
  try {
    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'appsecotech'
    });
    
    console.log('Connexion à la base de données réussie');
    
    // Créer la table Account sans contrainte de clé étrangère
    console.log('Création de la table account...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS account (
        id VARCHAR(191) PRIMARY KEY,
        userId VARCHAR(191) NOT NULL,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        providerAccountId VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INT,
        token_type VARCHAR(255),
        scope VARCHAR(255),
        id_token TEXT,
        session_state VARCHAR(255),
        
        UNIQUE INDEX provider_providerAccountId (provider, providerAccountId),
        INDEX userId (userId)
      )
    `);
    console.log('Table account créée avec succès');
    
    // Créer la table Session sans contrainte de clé étrangère
    console.log('Création de la table session...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS session (
        id VARCHAR(191) PRIMARY KEY,
        sessionToken VARCHAR(255) UNIQUE NOT NULL,
        userId VARCHAR(191) NOT NULL,
        expires DATETIME NOT NULL,
        
        INDEX userId (userId)
      )
    `);
    console.log('Table session créée avec succès');
    
    // Créer la table VerificationToken
    console.log('Création de la table verificationtoken...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS verificationtoken (
        identifier VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires DATETIME NOT NULL,
        
        UNIQUE INDEX token (token),
        UNIQUE INDEX identifier_token (identifier, token)
      )
    `);
    console.log('Table verificationtoken créée avec succès');
    
    // Vérifier que les tables ont été créées
    const [updatedTables] = await connection.execute('SHOW TABLES');
    console.log('\nTables dans la base de données:');
    updatedTables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Fermer la connexion
    await connection.end();
    
    console.log('\nToutes les tables NextAuth ont été créées avec succès!');
    console.log('Vous pouvez maintenant vous connecter à l\'application avec:');
    console.log('Email: admin@example.com');
    console.log('Mot de passe: Admin123!');
    
    return true;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Exécuter la fonction
createNextAuthTables(); 