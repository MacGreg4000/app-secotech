// Configuration des en-têtes et pieds de page pour le PDF

exports.header = {
  height: '2cm',
  contents: function(pageNum, numPages) {
    if (pageNum === 1) return ''; // Pas d'en-tête sur la première page
    
    return `
      <div style="text-align: right; font-size: 9pt; color: #888; width: 100%; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
        <span style="float: left;">SecoTech - Guide d'utilisation</span>
        <span>Page ${pageNum} sur ${numPages}</span>
      </div>
    `;
  }
};

exports.footer = {
  height: '1.5cm',
  contents: function(pageNum, numPages) {
    if (pageNum === 1) return ''; // Pas de pied de page sur la première page
    
    return `
      <div style="text-align: center; font-size: 9pt; color: #888; width: 100%; border-top: 1px solid #ddd; padding-top: 5px;">
        <span>© ${new Date().getFullYear()} SecoTech - Tous droits réservés</span>
      </div>
    `;
  }
}; 