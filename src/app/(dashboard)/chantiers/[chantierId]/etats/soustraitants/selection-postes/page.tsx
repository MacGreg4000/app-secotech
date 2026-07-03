'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  HashtagIcon,
  TagIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import NumericInput from '@/components/ui/NumericInput'

interface LigneCommande {
  id: number;
  commandeId: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

interface Commande {
  id: number;
  reference: string;
  lignes: LigneCommande[];
}

interface LigneTarif {
  id: string;
  article: string | null;
  descriptif: string;
  unite: string | null;
  prixUnitaire: number | null;
  type: string;
}

export default function SelectionPostesPage() {
  const { chantierId } = useParams();
  const searchParams = useSearchParams();
  const soustraitantId = searchParams.get('soustraitantId');
  const router = useRouter();

  const [commande, setCommande] = useState<Commande | null>(null);
  const [tarifs, setTarifs] = useState<LigneTarif[]>([]);
  const [selectedLignes, setSelectedLignes] = useState<Map<number, LigneCommande>>(new Map());
  const [modifiedLignes, setModifiedLignes] = useState<Map<number, { quantite: number, prixUnitaire: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!soustraitantId) {
      toast.error('ID du sous-traitant manquant');
      router.push(`/chantiers/${chantierId}/etats/soustraitants`);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [commandeRes, tarifsRes] = await Promise.all([
          fetch(`/api/chantiers/${chantierId}/commande`),
          fetch(`/api/sous-traitants/${soustraitantId}/tarifs`)
        ]);

        if (!commandeRes.ok) {
          if (commandeRes.status === 404) {
            toast.error('Aucune commande validée trouvée pour ce chantier');
          } else {
            toast.error('Erreur lors de la récupération de la commande client');
          }
          return;
        }

        const commandeData = await commandeRes.json();
        setCommande(commandeData);

        if (tarifsRes.ok) {
          const tarifsData = await tarifsRes.json();
          setTarifs(tarifsData);
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chantierId, soustraitantId, router]);

  // Index des tarifs par numéro d'article (normalisation lowercase + trim)
  const tarifsIndex = useMemo(() => {
    const map = new Map<string, LigneTarif>();
    for (const t of tarifs) {
      if (t.article && t.type === 'LIGNE') {
        map.set(t.article.trim().toLowerCase(), t);
      }
    }
    return map;
  }, [tarifs]);

  const getTarifForLigne = (article: string): LigneTarif | null =>
    tarifsIndex.get(article.trim().toLowerCase()) ?? null;

  const handleSelectLigne = (ligne: LigneCommande) => {
    const newSelectedLignes = new Map(selectedLignes);

    if (newSelectedLignes.has(ligne.id)) {
      newSelectedLignes.delete(ligne.id);
      const newModifiedLignes = new Map(modifiedLignes);
      newModifiedLignes.delete(ligne.id);
      setModifiedLignes(newModifiedLignes);
    } else {
      newSelectedLignes.set(ligne.id, ligne);
      if (!modifiedLignes.has(ligne.id)) {
        const tarif = getTarifForLigne(ligne.article);
        const newModifiedLignes = new Map(modifiedLignes);
        newModifiedLignes.set(ligne.id, {
          quantite: ligne.quantite,
          // Pré-remplir avec le tarif ST si disponible, sinon prix client
          prixUnitaire: tarif?.prixUnitaire ?? ligne.prixUnitaire
        });
        setModifiedLignes(newModifiedLignes);
      }
    }

    setSelectedLignes(newSelectedLignes);
  };

  const handleQuantiteChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    newModifiedLignes.set(ligneId, { ...currentValues, quantite: value === '' ? 0 : parseFloat(value) });
    setModifiedLignes(newModifiedLignes);
  };

  const handlePrixChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    newModifiedLignes.set(ligneId, { ...currentValues, prixUnitaire: value === '' ? 0 : parseFloat(value) });
    setModifiedLignes(newModifiedLignes);
  };

  const applyTarifST = (ligneId: number, tarifPrix: number) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: tarifPrix };
    newModifiedLignes.set(ligneId, { ...currentValues, prixUnitaire: tarifPrix });
    setModifiedLignes(newModifiedLignes);
  };

  const handleSubmit = async () => {
    if (selectedLignes.size === 0) {
      toast.error('Veuillez sélectionner au moins un poste');
      return;
    }

    try {
      setSubmitting(true);
      const lignesArray = Array.from(selectedLignes.values()).map(ligne => {
        const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';
        const modifiedValues = modifiedLignes.get(ligne.id);
        if (isSection) {
          return { article: ligne.article, description: ligne.description, type: ligne.type, unite: '', prixUnitaire: 0, quantite: 0 };
        }
        return {
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: modifiedValues?.prixUnitaire || ligne.prixUnitaire,
          quantite: modifiedValues?.quantite || ligne.quantite
        };
      });

      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/commandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lignes: lignesArray,
          reference: commande?.reference || `Commande ST - ${new Date().toISOString().split('T')[0]}`,
          tauxTVA: 0
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la création de la commande sous-traitant');

      const result = await response.json();
      toast.success('Commande sous-traitant créée avec succès');
      router.push(`/chantiers/${chantierId}/etats/soustraitants/${soustraitantId}/commande/${result.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la commande sous-traitant');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedLignes.forEach((ligne) => {
      if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') return;
      const modifiedValues = modifiedLignes.get(ligne.id);
      const quantite = modifiedValues?.quantite ?? ligne.quantite;
      const prix = modifiedValues?.prixUnitaire ?? ligne.prixUnitaire;
      total += quantite * prix;
    });
    return total;
  };

  const tarifsMatchCount = useMemo(() => {
    if (!commande) return 0;
    return commande.lignes.filter(l =>
      l.type !== 'TITRE' && l.type !== 'SOUS_TITRE' && getTarifForLigne(l.article)
    ).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commande, tarifsIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement des postes disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8 px-4 space-y-8">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link href={`/chantiers/${chantierId}/etats/soustraitants`}>
              <Button variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                Sélection des postes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Choisissez les postes à sous-traiter
              </p>
            </div>
          </div>

          {selectedLignes.size > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircleIcon className="h-5 w-5 mr-1" />
                  <span className="font-semibold">{selectedLignes.size} poste{selectedLignes.size > 1 ? 's' : ''} sélectionné{selectedLignes.size > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CurrencyEuroIcon className="h-5 w-5 mr-1" />
                  <span className="font-bold">{calculateTotal().toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bandeau info tarifs */}
        {tarifs.length > 0 && commande && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
            <TagIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{tarifs.filter(t => t.type === 'LIGNE').length} tarif{tarifs.filter(t => t.type === 'LIGNE').length > 1 ? 's' : ''} sous-traitant disponible{tarifs.filter(t => t.type === 'LIGNE').length > 1 ? 's' : ''}</span>
              {tarifsMatchCount > 0
                ? ` — ${tarifsMatchCount} poste${tarifsMatchCount > 1 ? 's correspondent' : ' correspond'} (prix ST pré-rempli automatiquement).`
                : ' — aucune correspondance avec les postes de cette commande.'}
            </div>
          </div>
        )}
        {tarifs.length === 0 && (
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun tarif sous-traitant enregistré. Vous pouvez en ajouter depuis la fiche du sous-traitant.
            </p>
          </div>
        )}

        {/* Carte principale */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Postes disponibles — Commande client</CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  La colonne <span className="font-semibold">Tarif ST</span> affiche le prix issu du bordereau du sous-traitant
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!commande ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium text-lg">Aucune commande client validée trouvée pour ce chantier</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Veuillez d'abord valider une commande client pour ce chantier</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <colgroup>
                        <col style={{ width: '52px' }} />
                        <col style={{ width: '72px' }} />
                        <col />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '68px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '170px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                          <th className="px-4 py-3 text-left">
                            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            <div className="flex items-center gap-1"><HashtagIcon className="h-3.5 w-3.5" />Art.</div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Description</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Unité</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Quantité</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            <div className="flex items-center justify-end gap-1"><CurrencyEuroIcon className="h-3.5 w-3.5" />Prix unit.</div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                            <div className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400">
                              <TagIcon className="h-3.5 w-3.5" />
                              Tarif ST
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {commande.lignes.map((ligne, index) => {
                          const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';
                          const isSelected = selectedLignes.has(ligne.id);
                          const modifiedValues = modifiedLignes.get(ligne.id);
                          const quantite = modifiedValues?.quantite ?? ligne.quantite;
                          const prix = modifiedValues?.prixUnitaire ?? ligne.prixUnitaire;
                          const tarif = !isSection ? getTarifForLigne(ligne.article) : null;

                          // Calcul de la marge : (prixClient - prixST) / prixClient
                          const tarifPrix = tarif?.prixUnitaire ?? null;
                          const prixActuel = modifiedValues?.prixUnitaire ?? ligne.prixUnitaire;
                          const margePercent = tarifPrix !== null && ligne.prixUnitaire > 0
                            ? ((ligne.prixUnitaire - tarifPrix) / ligne.prixUnitaire) * 100
                            : null;

                          return (
                            <tr
                              key={ligne.id}
                              className={`
                                border-b border-gray-100 dark:border-gray-700 transition-all duration-200
                                ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750'}
                                ${isSelected
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-sm'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                                ${isSection ? 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700/60 dark:to-slate-700/40' : ''}
                              `}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectLigne(ligne)}
                                    className="h-5 w-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                    disabled={!commande}
                                  />
                                </label>
                              </td>

                              {/* Article */}
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  {ligne.article}
                                </span>
                              </td>

                              {/* Description */}
                              <td className="px-4 py-3">
                                <div className={`font-medium ${isSection ? 'text-gray-900 dark:text-white uppercase text-xs tracking-wide' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {ligne.description}
                                </div>
                                {tarif?.descriptif && tarif.descriptif !== ligne.description && !isSection && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic">
                                    ST : {tarif.descriptif}
                                  </div>
                                )}
                              </td>

                              {/* Type */}
                              <td className="px-4 py-3 text-center">
                                {!isSection && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    ligne.type === 'QP'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  }`}>
                                    {ligne.type}
                                  </span>
                                )}
                              </td>

                              {/* Unité */}
                              <td className="px-4 py-3 text-center">
                                <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">{ligne.unite}</span>
                              </td>

                              {/* Quantité */}
                              <td className="px-4 py-3 text-right">
                                {isSection ? (
                                  <span className="text-gray-400">—</span>
                                ) : isSelected ? (
                                  <NumericInput
                                    value={quantite}
                                    onChangeNumber={val => handleQuantiteChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-20 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                    disabled={!commande}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{ligne.quantite}</span>
                                )}
                              </td>

                              {/* Prix unitaire (modifiable si sélectionné) */}
                              <td className="px-4 py-3 text-right">
                                {isSection ? (
                                  <span className="text-gray-400">—</span>
                                ) : isSelected ? (
                                  <NumericInput
                                    value={prix}
                                    onChangeNumber={val => handlePrixChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-24 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                    disabled={!commande}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {ligne.prixUnitaire.toFixed(2)} €
                                  </span>
                                )}
                              </td>

                              {/* Tarif ST */}
                              <td className="px-4 py-3 text-right">
                                {isSection ? (
                                  <span className="text-gray-400">—</span>
                                ) : tarif && tarifPrix !== null ? (
                                  <div className="flex flex-col items-end gap-1">
                                    {/* Prix ST */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                                        {tarifPrix.toFixed(2)} €
                                      </span>
                                      {/* Badge marge */}
                                      {margePercent !== null && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                          margePercent > 0
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : margePercent < 0
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                          {margePercent > 0 ? '+' : ''}{margePercent.toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                    {/* Bouton appliquer si sélectionné ET prix différent */}
                                    {isSelected && Math.abs(prixActuel - tarifPrix) > 0.001 && (
                                      <button
                                        onClick={() => applyTarifST(ligne.id, tarifPrix)}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                                        title="Appliquer le tarif ST"
                                      >
                                        <ArrowDownTrayIcon className="h-3 w-3" />
                                        Appliquer
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Non référencé</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Résumé et actions */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {selectedLignes.size > 0 && (
                    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <ShoppingCartIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Résumé de la sélection
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedLignes.size}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Poste{selectedLignes.size > 1 ? 's' : ''} sélectionné{selectedLignes.size > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{calculateTotal().toFixed(2)} €</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Total HT</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/chantiers/${chantierId}/etats/soustraitants`)}
                      disabled={submitting}
                      className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm transition-all duration-200"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !commande || selectedLignes.size === 0}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Création en cours...</>
                      ) : (
                        <><CheckCircleIcon className="h-4 w-4 mr-2" />Valider et créer la commande</>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
