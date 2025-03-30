#!/usr/bin/env node

/**
 * Script pour nettoyer les console.log du code source
 * Exécuter avec: node scripts/clean-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.join(__dirname, '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'public', 'dist', 'build'];
const LOG_METHODS = ['log', 'debug', 'info', 'warn', 'error'];

// Expressions régulières pour trouver les console.log
const createConsoleRegex = (method) => 
  new RegExp(`console\\.${method}\\s*\\([^)]*\\)`, 'g');

const consoleRegexes = LOG_METHODS.map(method => ({ 
  method, 
  regex: createConsoleRegex(method) 
}));

// Fonction pour vérifier si un fichier doit être traité
const shouldProcessFile = (filePath) => {
  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) return false;
  
  const relativePath = path.relative(__dirname, filePath);
  return !IGNORE_DIRS.some(dir => relativePath.includes(dir));
};

// Fonction pour traiter un fichier
const processFile = (filePath) => {
  try {
    // Lire le contenu du fichier
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Rechercher et commenter les console.log
    consoleRegexes.forEach(({ method, regex }) => {
      content = content.replace(regex, match => {
        modified = true;
        return `// ${match} /* Auto-commented by clean-logs.js */`;
      });
    });
    
    // Écrire le fichier modifié
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Nettoyé: ${path.relative(process.cwd(), filePath)}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error);
    return 0;
  }
};

// Fonction pour parcourir récursivement les répertoires
const walkDir = (dir, callback) => {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Ignorer les répertoires dans la liste
        if (!IGNORE_DIRS.includes(file)) {
          walkDir(filePath, callback);
        }
      } else if (shouldProcessFile(filePath)) {
        callback(filePath);
      }
    });
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture du répertoire ${dir}:`, error);
  }
};

// Point d'entrée principal
console.log('🔍 Recherche des console.log à nettoyer...');

let count = 0;
walkDir(SOURCE_DIR, (filePath) => {
  count += processFile(filePath);
});

console.log(`✨ Terminé! ${count} console.log ont été commentés.`);

// Ajouter une option pour mettre à jour package.json
if (count > 0) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Ajouter le script s'il n'existe pas
    if (!packageJson.scripts.clean) {
      packageJson.scripts.clean = "node scripts/clean-logs.js";
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('📝 Script "clean" ajouté à package.json');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de package.json:', error);
  }
} 