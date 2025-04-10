
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('@prisma/client/runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.5.0
 * Query Engine version: 173f8d54f8d52e692c7e27e72a88314ec7aeff60
 */
Prisma.prismaVersion = {
  client: "6.5.0",
  engine: "173f8d54f8d52e692c7e27e72a88314ec7aeff60"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.SettingsScalarFieldEnum = {
  id: 'id',
  logo: 'logo',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmintaskScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  completedBy: 'completedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  completed: 'completed',
  completedAt: 'completedAt',
  taskType: 'taskType',
  title: 'title'
};

exports.Prisma.PretScalarFieldEnum = {
  id: 'id',
  machineId: 'machineId',
  userId: 'userId',
  datePret: 'datePret',
  dateRetourPrevue: 'dateRetourPrevue',
  dateRetourEffective: 'dateRetourEffective',
  statut: 'statut',
  commentaire: 'commentaire',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  emprunteur: 'emprunteur'
};

exports.Prisma.SoustraitantScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  email: 'email',
  contact: 'contact',
  adresse: 'adresse',
  telephone: 'telephone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tva: 'tva'
};

exports.Prisma.ContratScalarFieldEnum = {
  id: 'id',
  soustraitantId: 'soustraitantId',
  url: 'url',
  dateGeneration: 'dateGeneration',
  dateSignature: 'dateSignature',
  estSigne: 'estSigne',
  token: 'token'
};

exports.Prisma.FicheTechniqueScalarFieldEnum = {
  id: 'id',
  titre: 'titre',
  categorie: 'categorie',
  sousCategorie: 'sousCategorie',
  fichierUrl: 'fichierUrl',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  referenceCSC: 'referenceCSC'
};

exports.Prisma.CommandeScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  clientId: 'clientId',
  dateCommande: 'dateCommande',
  reference: 'reference',
  tauxTVA: 'tauxTVA',
  sousTotal: 'sousTotal',
  totalOptions: 'totalOptions',
  tva: 'tva',
  total: 'total',
  statut: 'statut',
  estVerrouillee: 'estVerrouillee',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LigneCommandeScalarFieldEnum = {
  id: 'id',
  commandeId: 'commandeId',
  ordre: 'ordre',
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  total: 'total',
  estOption: 'estOption',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EtatAvancementScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  numero: 'numero',
  date: 'date',
  commentaires: 'commentaires',
  estFinalise: 'estFinalise',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.LigneEtatAvancementScalarFieldEnum = {
  id: 'id',
  etatAvancementId: 'etatAvancementId',
  ligneCommandeId: 'ligneCommandeId',
  quantitePrecedente: 'quantitePrecedente',
  quantiteActuelle: 'quantiteActuelle',
  quantiteTotale: 'quantiteTotale',
  montantPrecedent: 'montantPrecedent',
  montantActuel: 'montantActuel',
  montantTotal: 'montantTotal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  article: 'article',
  description: 'description',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.AvenantEtatAvancementScalarFieldEnum = {
  id: 'id',
  etatAvancementId: 'etatAvancementId',
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  quantitePrecedente: 'quantitePrecedente',
  quantiteActuelle: 'quantiteActuelle',
  quantiteTotale: 'quantiteTotale',
  montantPrecedent: 'montantPrecedent',
  montantActuel: 'montantActuel',
  montantTotal: 'montantTotal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanysettingsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  address: 'address',
  zipCode: 'zipCode',
  city: 'city',
  phone: 'phone',
  email: 'email',
  tva: 'tva',
  logo: 'logo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  emailFrom: 'emailFrom',
  emailFromName: 'emailFromName',
  emailHost: 'emailHost',
  emailPassword: 'emailPassword',
  emailPort: 'emailPort',
  emailSecure: 'emailSecure',
  emailUser: 'emailUser',
  iban: 'iban'
};

exports.Prisma.CommandeSousTraitantScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  soustraitantId: 'soustraitantId',
  dateCommande: 'dateCommande',
  reference: 'reference',
  tauxTVA: 'tauxTVA',
  sousTotal: 'sousTotal',
  tva: 'tva',
  total: 'total',
  statut: 'statut',
  estVerrouillee: 'estVerrouillee',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LigneCommandeSousTraitantScalarFieldEnum = {
  id: 'id',
  commandeSousTraitantId: 'commandeSousTraitantId',
  ordre: 'ordre',
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  total: 'total',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.Avenant_soustraitant_etat_avancementScalarFieldEnum = {
  id: 'id',
  soustraitantEtatAvancementId: 'soustraitantEtatAvancementId',
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  quantitePrecedente: 'quantitePrecedente',
  quantiteActuelle: 'quantiteActuelle',
  quantiteTotale: 'quantiteTotale',
  montantPrecedent: 'montantPrecedent',
  montantActuel: 'montantActuel',
  montantTotal: 'montantTotal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.Ligne_soustraitant_etat_avancementScalarFieldEnum = {
  id: 'id',
  soustraitantEtatAvancementId: 'soustraitantEtatAvancementId',
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite',
  prixUnitaire: 'prixUnitaire',
  quantite: 'quantite',
  quantitePrecedente: 'quantitePrecedente',
  quantiteActuelle: 'quantiteActuelle',
  quantiteTotale: 'quantiteTotale',
  montantPrecedent: 'montantPrecedent',
  montantActuel: 'montantActuel',
  montantTotal: 'montantTotal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.Soustraitant_etat_avancementScalarFieldEnum = {
  id: 'id',
  soustraitantId: 'soustraitantId',
  numero: 'numero',
  date: 'date',
  commentaires: 'commentaires',
  estFinalise: 'estFinalise',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  commandeSousTraitantId: 'commandeSousTraitantId',
  etatAvancementId: 'etatAvancementId'
};

exports.Prisma.Photo_soustraitant_etat_avancementScalarFieldEnum = {
  id: 'id',
  soustraitantEtatAvancementId: 'soustraitantEtatAvancementId',
  url: 'url',
  description: 'description',
  dateAjout: 'dateAjout'
};

exports.Prisma.DepenseScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  date: 'date',
  montant: 'montant',
  description: 'description',
  categorie: 'categorie',
  fournisseur: 'fournisseur',
  reference: 'reference',
  justificatif: 'justificatif',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserNotesScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RackScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  position: 'position',
  lignes: 'lignes',
  colonnes: 'colonnes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmplacementScalarFieldEnum = {
  id: 'id',
  rackId: 'rackId',
  ligne: 'ligne',
  colonne: 'colonne',
  codeQR: 'codeQR',
  statut: 'statut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MateriauScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  description: 'description',
  quantite: 'quantite',
  codeQR: 'codeQR',
  emplacementId: 'emplacementId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AvenantScalarFieldEnum = {
  id: 'id',
  numero: 'numero',
  date: 'date',
  description: 'description',
  chantierId: 'chantierId',
  marcheId: 'marcheId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChantierScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  nomChantier: 'nomChantier',
  adresseChantier: 'adresseChantier',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  clientId: 'clientId',
  budget: 'budget',
  dateDebut: 'dateDebut',
  dateFinPrevue: 'dateFinPrevue',
  dateFinReelle: 'dateFinReelle',
  description: 'description',
  statut: 'statut',
  villeChantier: 'villeChantier',
  dureeEnJours: 'dureeEnJours',
  typeDuree: 'typeDuree'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  email: 'email',
  adresse: 'adresse',
  telephone: 'telephone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  type: 'type',
  url: 'url',
  taille: 'taille',
  mimeType: 'mimeType',
  chantierId: 'chantierId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  metadata: 'metadata'
};

exports.Prisma.DocumentOuvrierScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  type: 'type',
  url: 'url',
  dateExpiration: 'dateExpiration',
  ouvrierId: 'ouvrierId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EtatScalarFieldEnum = {
  id: 'id',
  numero: 'numero',
  date: 'date',
  chantierId: 'chantierId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LigneEtatScalarFieldEnum = {
  id: 'id',
  etatId: 'etatId',
  ligneMarcheId: 'ligneMarcheId',
  quantite: 'quantite',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LigneMarcheScalarFieldEnum = {
  id: 'id',
  article: 'article',
  descriptif: 'descriptif',
  unite: 'unite',
  quantite: 'quantite',
  prixUnitaire: 'prixUnitaire',
  marcheId: 'marcheId'
};

exports.Prisma.MachineScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  modele: 'modele',
  numeroSerie: 'numeroSerie',
  localisation: 'localisation',
  statut: 'statut',
  dateAchat: 'dateAchat',
  qrCode: 'qrCode',
  commentaire: 'commentaire',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarcheScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  dateImport: 'dateImport',
  montantTotal: 'montantTotal'
};

exports.Prisma.NoteScalarFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  contenu: 'contenu',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OuvrierScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  prenom: 'prenom',
  email: 'email',
  telephone: 'telephone',
  dateEntree: 'dateEntree',
  poste: 'poste',
  sousTraitantId: 'sousTraitantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TacheScalarFieldEnum = {
  id: 'id',
  label: 'label',
  completed: 'completed',
  completedAt: 'completedAt',
  chantierId: 'chantierId',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name'
};

exports.Prisma.BonRegieScalarFieldEnum = {
  id: 'id',
  dates: 'dates',
  client: 'client',
  nomChantier: 'nomChantier',
  description: 'description',
  tempsPreparation: 'tempsPreparation',
  tempsTrajets: 'tempsTrajets',
  tempsChantier: 'tempsChantier',
  nombreTechniciens: 'nombreTechniciens',
  materiaux: 'materiaux',
  nomSignataire: 'nomSignataire',
  signature: 'signature',
  dateSignature: 'dateSignature',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  chantierId: 'chantierId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.SettingsOrderByRelevanceFieldEnum = {
  logo: 'logo'
};

exports.Prisma.admintaskOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  completedBy: 'completedBy',
  taskType: 'taskType',
  title: 'title'
};

exports.Prisma.pretOrderByRelevanceFieldEnum = {
  id: 'id',
  machineId: 'machineId',
  userId: 'userId',
  commentaire: 'commentaire',
  emprunteur: 'emprunteur'
};

exports.Prisma.soustraitantOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  email: 'email',
  contact: 'contact',
  adresse: 'adresse',
  telephone: 'telephone',
  tva: 'tva'
};

exports.Prisma.contratOrderByRelevanceFieldEnum = {
  id: 'id',
  soustraitantId: 'soustraitantId',
  url: 'url',
  token: 'token'
};

exports.Prisma.FicheTechniqueOrderByRelevanceFieldEnum = {
  id: 'id',
  titre: 'titre',
  categorie: 'categorie',
  sousCategorie: 'sousCategorie',
  fichierUrl: 'fichierUrl',
  description: 'description',
  referenceCSC: 'referenceCSC'
};

exports.Prisma.CommandeOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  clientId: 'clientId',
  reference: 'reference',
  statut: 'statut'
};

exports.Prisma.LigneCommandeOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.EtatAvancementOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  commentaires: 'commentaires',
  createdBy: 'createdBy'
};

exports.Prisma.LigneEtatAvancementOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.AvenantEtatAvancementOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.companysettingsOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  address: 'address',
  zipCode: 'zipCode',
  city: 'city',
  phone: 'phone',
  email: 'email',
  tva: 'tva',
  logo: 'logo',
  emailFrom: 'emailFrom',
  emailFromName: 'emailFromName',
  emailHost: 'emailHost',
  emailPassword: 'emailPassword',
  emailPort: 'emailPort',
  emailUser: 'emailUser',
  iban: 'iban'
};

exports.Prisma.CommandeSousTraitantOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  soustraitantId: 'soustraitantId',
  reference: 'reference',
  statut: 'statut'
};

exports.Prisma.LigneCommandeSousTraitantOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.avenant_soustraitant_etat_avancementOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.ligne_soustraitant_etat_avancementOrderByRelevanceFieldEnum = {
  article: 'article',
  description: 'description',
  type: 'type',
  unite: 'unite'
};

exports.Prisma.soustraitant_etat_avancementOrderByRelevanceFieldEnum = {
  soustraitantId: 'soustraitantId',
  commentaires: 'commentaires'
};

exports.Prisma.photo_soustraitant_etat_avancementOrderByRelevanceFieldEnum = {
  url: 'url',
  description: 'description'
};

exports.Prisma.DepenseOrderByRelevanceFieldEnum = {
  id: 'id',
  chantierId: 'chantierId',
  description: 'description',
  categorie: 'categorie',
  fournisseur: 'fournisseur',
  reference: 'reference',
  justificatif: 'justificatif',
  createdBy: 'createdBy'
};

exports.Prisma.UserNotesOrderByRelevanceFieldEnum = {
  userId: 'userId',
  content: 'content'
};

exports.Prisma.RackOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  position: 'position'
};

exports.Prisma.EmplacementOrderByRelevanceFieldEnum = {
  id: 'id',
  rackId: 'rackId',
  codeQR: 'codeQR',
  statut: 'statut'
};

exports.Prisma.MateriauOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  description: 'description',
  codeQR: 'codeQR',
  emplacementId: 'emplacementId'
};

exports.Prisma.AvenantOrderByRelevanceFieldEnum = {
  description: 'description',
  chantierId: 'chantierId'
};

exports.Prisma.ChantierOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  nomChantier: 'nomChantier',
  adresseChantier: 'adresseChantier',
  clientId: 'clientId',
  description: 'description',
  statut: 'statut',
  villeChantier: 'villeChantier',
  typeDuree: 'typeDuree'
};

exports.Prisma.ClientOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  email: 'email',
  adresse: 'adresse',
  telephone: 'telephone'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.DocumentOrderByRelevanceFieldEnum = {
  nom: 'nom',
  type: 'type',
  url: 'url',
  mimeType: 'mimeType',
  chantierId: 'chantierId',
  createdBy: 'createdBy'
};

exports.Prisma.DocumentOuvrierOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  type: 'type',
  url: 'url',
  ouvrierId: 'ouvrierId'
};

exports.Prisma.EtatOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId'
};

exports.Prisma.LigneMarcheOrderByRelevanceFieldEnum = {
  descriptif: 'descriptif',
  unite: 'unite'
};

exports.Prisma.MachineOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  modele: 'modele',
  numeroSerie: 'numeroSerie',
  localisation: 'localisation',
  qrCode: 'qrCode',
  commentaire: 'commentaire'
};

exports.Prisma.MarcheOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId'
};

exports.Prisma.NoteOrderByRelevanceFieldEnum = {
  chantierId: 'chantierId',
  contenu: 'contenu',
  createdBy: 'createdBy'
};

exports.Prisma.OuvrierOrderByRelevanceFieldEnum = {
  id: 'id',
  nom: 'nom',
  prenom: 'prenom',
  email: 'email',
  telephone: 'telephone',
  poste: 'poste',
  sousTraitantId: 'sousTraitantId'
};

exports.Prisma.TacheOrderByRelevanceFieldEnum = {
  id: 'id',
  label: 'label',
  chantierId: 'chantierId',
  category: 'category'
};

exports.Prisma.UserOrderByRelevanceFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name'
};

exports.Prisma.BonRegieOrderByRelevanceFieldEnum = {
  dates: 'dates',
  client: 'client',
  nomChantier: 'nomChantier',
  description: 'description',
  materiaux: 'materiaux',
  nomSignataire: 'nomSignataire',
  signature: 'signature',
  chantierId: 'chantierId'
};
exports.pret_statut = exports.$Enums.pret_statut = {
  EN_COURS: 'EN_COURS',
  TERMINE: 'TERMINE'
};

exports.Machine_statut = exports.$Enums.Machine_statut = {
  DISPONIBLE: 'DISPONIBLE',
  PRETE: 'PRETE',
  EN_PANNE: 'EN_PANNE',
  EN_REPARATION: 'EN_REPARATION',
  MANQUE_CONSOMMABLE: 'MANQUE_CONSOMMABLE'
};

exports.User_role = exports.$Enums.User_role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER'
};

exports.Prisma.ModelName = {
  Settings: 'Settings',
  admintask: 'admintask',
  pret: 'pret',
  soustraitant: 'soustraitant',
  contrat: 'contrat',
  FicheTechnique: 'FicheTechnique',
  Commande: 'Commande',
  LigneCommande: 'LigneCommande',
  EtatAvancement: 'EtatAvancement',
  LigneEtatAvancement: 'LigneEtatAvancement',
  AvenantEtatAvancement: 'AvenantEtatAvancement',
  companysettings: 'companysettings',
  CommandeSousTraitant: 'CommandeSousTraitant',
  LigneCommandeSousTraitant: 'LigneCommandeSousTraitant',
  avenant_soustraitant_etat_avancement: 'avenant_soustraitant_etat_avancement',
  ligne_soustraitant_etat_avancement: 'ligne_soustraitant_etat_avancement',
  soustraitant_etat_avancement: 'soustraitant_etat_avancement',
  photo_soustraitant_etat_avancement: 'photo_soustraitant_etat_avancement',
  Depense: 'Depense',
  UserNotes: 'UserNotes',
  Rack: 'Rack',
  Emplacement: 'Emplacement',
  Materiau: 'Materiau',
  Avenant: 'Avenant',
  Chantier: 'Chantier',
  Client: 'Client',
  Document: 'Document',
  DocumentOuvrier: 'DocumentOuvrier',
  Etat: 'Etat',
  LigneEtat: 'LigneEtat',
  LigneMarche: 'LigneMarche',
  Machine: 'Machine',
  Marche: 'Marche',
  Note: 'Note',
  Ouvrier: 'Ouvrier',
  Tache: 'Tache',
  User: 'User',
  BonRegie: 'BonRegie'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
