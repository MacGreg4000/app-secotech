const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

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
    
    // Vérifier si la table user existe (en minuscules)
    const [tables] = await connection.execute("SHOW TABLES LIKE 'user'");
    
    if (tables.length === 0) {
      console.log('La table user n\'existe pas. Création de la table...');
      
      // Créer la table user
      await connection.execute(`
        CREATE TABLE user (
          id VARCHAR(191) PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('ADMIN', 'MANAGER', 'USER') DEFAULT 'USER',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Table user créée avec succès');
    } else {
      console.log('La table user existe déjà');
    }
    
    // Générer un mot de passe haché
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Générer un ID unique au format CUID
    const id = randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await connection.execute(
      'SELECT * FROM user WHERE email = ?',
      ['admin@example.com']
    );
    
    if (existingUsers.length > 0) {
      console.log('L\'utilisateur admin@example.com existe déjà. Mise à jour du mot de passe...');
      
      // Mettre à jour le mot de passe
      await connection.execute(
        'UPDATE user SET password = ?, updatedAt = ? WHERE email = ?',
        [hashedPassword, now, 'admin@example.com']
      );
      
      console.log('Mot de passe mis à jour avec succès');
    } else {
      console.log('Création d\'un nouvel utilisateur administrateur...');
      
      // Insérer le nouvel utilisateur
      await connection.execute(
        'INSERT INTO user (id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, 'Administrateur', 'admin@example.com', hashedPassword, 'ADMIN', now, now]
      );
      
      console.log('Utilisateur administrateur créé avec succès');
    }
    
    // Vérifier que l'utilisateur a bien été créé
    const [users] = await connection.execute('SELECT id, name, email, role FROM user WHERE email = ?', ['admin@example.com']);
    
    if (users.length > 0) {
      console.log('\nUtilisateur administrateur:');
      console.log(`- ID: ${users[0].id}`);
      console.log(`- Nom: ${users[0].name}`);
      console.log(`- Email: ${users[0].email}`);
      console.log(`- Rôle: ${users[0].role}`);
      
      console.log('\nInformations de connexion:');
      console.log('Email: admin@example.com');
      console.log('Mot de passe: Admin123!');
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
createAdminUser(); 