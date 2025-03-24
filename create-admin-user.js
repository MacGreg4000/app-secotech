const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  console.log('Création d\'un utilisateur administrateur...');
  
  try {
    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'appsecotech'
    });
    
    console.log('Connexion à la base de données réussie');
    
    // Vérifier si la table User existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'User'");
    
    if (tables.length === 0) {
      console.log('La table User n\'existe pas. Création de la table...');
      
      // Créer la table User
      await connection.execute(`
        CREATE TABLE User (
          id VARCHAR(191) PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          role ENUM('USER', 'ADMIN') DEFAULT 'USER',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Table User créée avec succès');
    }
    
    // Générer un mot de passe haché
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Générer un ID unique
    const id = Date.now().toString();
    
    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await connection.execute(
      'SELECT * FROM User WHERE email = ?',
      ['admin@example.com']
    );
    
    if (existingUsers.length > 0) {
      console.log('L\'utilisateur admin@example.com existe déjà. Mise à jour du mot de passe...');
      
      // Mettre à jour le mot de passe
      await connection.execute(
        'UPDATE User SET password = ? WHERE email = ?',
        [hashedPassword, 'admin@example.com']
      );
      
      console.log('Mot de passe mis à jour avec succès');
    } else {
      console.log('Création d\'un nouvel utilisateur administrateur...');
      
      // Insérer le nouvel utilisateur
      await connection.execute(
        'INSERT INTO User (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [id, 'Administrateur', 'admin@example.com', hashedPassword, 'ADMIN']
      );
      
      console.log('Utilisateur administrateur créé avec succès');
    }
    
    console.log('\nInformations de connexion:');
    console.log('Email: admin@example.com');
    console.log('Mot de passe: Admin123!');
    
    // Fermer la connexion
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Exécuter la fonction
createAdminUser(); 