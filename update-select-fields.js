/**
 * Script pour guider la conversion des champs select en composants SelectField
 * 
 * Ce script n'est pas destiné à être exécuté automatiquement, mais plutôt à servir
 * de guide pour les développeurs qui doivent mettre à jour les champs select.
 */

/**
 * Exemple de conversion:
 * 
 * Avant:
 * 
 * <div>
 *   <label className="block text-sm font-medium text-gray-700">
 *     État du chantier
 *   </label>
 *   <select
 *     name="etatChantier"
 *     value={formData.etatChantier}
 *     onChange={(e) => setFormData(prev => ({
 *       ...prev,
 *       etatChantier: e.target.value
 *     }))}
 *     className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 *   >
 *     <option value="En préparation">En préparation</option>
 *     <option value="En cours">En cours</option>
 *     <option value="Terminé">Terminé</option>
 *   </select>
 * </div>
 * 
 * Après:
 * 
 * <SelectField
 *   label="État du chantier"
 *   name="etatChantier"
 *   value={formData.etatChantier}
 *   onChange={(e) => setFormData(prev => ({
 *     ...prev,
 *     etatChantier: e.target.value
 *   }))}
 *   className="mt-1"
 * >
 *   <option value="En préparation">En préparation</option>
 *   <option value="En cours">En cours</option>
 *   <option value="Terminé">Terminé</option>
 * </SelectField>
 */

/**
 * Fichiers à modifier (basés sur la recherche grep):
 * 
 * 1. src/components/outillage/RetourPretModal.tsx
 * 2. src/components/etat-avancement/EtatAvancementSSTraitant.tsx
 * 3. src/components/etat-avancement/EtatAvancementClient.tsx
 * 4. src/components/depense/DepenseList.tsx
 * 5. src/components/depense/DepenseForm.tsx
 * 6. src/components/ChantierStatus.tsx
 * 7. src/components/commande/LigneCommande.tsx
 * 8. src/app/(dashboard)/chantiers/[chantierId]/page.tsx
 * 9. src/app/(dashboard)/chantiers/[chantierId]/commande/page.tsx
 * 10. src/app/(dashboard)/sous-traitants/[id]/ouvriers/[ouvrierId]/documents/page.tsx
 * 11. src/app/(dashboard)/outillage/[machineId]/edit/page.tsx
 */

/**
 * Étapes à suivre pour chaque fichier:
 * 
 * 1. Ajouter l'import du composant SelectField:
 *    import SelectField from '@/components/ui/SelectField';
 * 
 * 2. Identifier chaque élément select et son label associé
 * 
 * 3. Extraire le label texte
 * 
 * 4. Remplacer le bloc div + label + select par un seul composant SelectField
 * 
 * 5. Conserver toutes les propriétés du select original (value, onChange, className, etc.)
 * 
 * 6. Conserver le contenu (options) du select original
 */ 