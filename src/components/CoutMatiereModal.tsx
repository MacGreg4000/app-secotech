'use client'

// Saisie du coût matière d'un chantier.
//
// Ouverte depuis le résumé financier de la page États — c'est-à-dire à l'endroit
// exact où le chiffre manquant se voit, et sur la page qui porte déjà les états
// d'avancement d'où proviennent les quantités. Pas de navigation, pas d'entrée
// de menu supplémentaire pour une saisie qu'on fait une fois par chantier.
//
// Deux données par ligne : la catégorie de pose (qui détermine le barème des
// consommables) et le prix d'achat au m² du carrelage. La catégorie est
// PROPOSÉE par la détection automatique mais jamais écrite d'office : un clic
// explicite l'applique, dans le même esprit que le dryRun des outils MCP.
//
// Le total n'est pas recalculé côté navigateur : la formule vit dans
// src/lib/rentabilite/calcul.ts et le serveur renvoie le résultat à
// l'enregistrement. Une copie côté client finirait par diverger.

import { Fragment, useCallback, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  CATEGORIES_MATERIAU,
  CATEGORIE_AUCUNE,
  LIBELLES_CATEGORIE,
  estCategorieMateriau,
  verifierUniteCategorie,
} from '@/lib/rentabilite/categories'

interface LigneSaisie {
  ligneCommandeId: number
  article: string
  description: string
  unite: string
  quantite: number
  categorieMateriau: string | null
  coutMatiereM2: number | null
  categorieSuggeree: string | null
  avertissementUnite: string | null
}

interface Props {
  chantierId: string
  open: boolean
  onClose: () => void
  /** Appelé après un enregistrement réussi, pour rafraîchir le résumé financier. */
  onSaved?: () => void
}

/** État local d'édition : le prix reste une chaîne tant qu'on le tape. */
interface Edition {
  categorie: string
  prix: string
}

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

export default function CoutMatiereModal({ chantierId, open, onClose, onSaved }: Props) {
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [lignes, setLignes] = useState<LigneSaisie[]>([])
  const [editions, setEditions] = useState<Record<number, Edition>>({})
  const [etatNumero, setEtatNumero] = useState<number | null>(null)
  // Chantier de pose seule : le carrelage est fourni par le client. Les champs
  // de prix d'achat deviennent sans objet, et leur absence cesse d'être un oubli.
  const [poseUniquement, setPoseUniquement] = useState(false)
  const [total, setTotal] = useState(0)
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageSucces, setMessageSucces] = useState<string | null>(null)

  const appliquerDonnees = useCallback(
    (data: {
      saisie?: { lignes?: LigneSaisie[]; etatNumero?: number | null; poseUniquement?: boolean }
      coutMatiereTotal?: number
    }) => {
      const l = data.saisie?.lignes || []
      setLignes(l)
      setEtatNumero(data.saisie?.etatNumero ?? null)
      setPoseUniquement(!!data.saisie?.poseUniquement)
      setTotal(Number(data.coutMatiereTotal) || 0)
      const init: Record<number, Edition> = {}
      for (const ligne of l) {
        init[ligne.ligneCommandeId] = {
          categorie: ligne.categorieMateriau || '',
          prix: ligne.coutMatiereM2 != null ? String(ligne.coutMatiereM2).replace('.', ',') : '',
        }
      }
      setEditions(init)
    },
    []
  )

  useEffect(() => {
    if (!open) return
    let annule = false
    setChargement(true)
    setErreur(null)
    setMessageSucces(null)
    fetch(`/api/chantiers/${chantierId}/cout-matiere`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Chargement impossible'))))
      .then((data) => {
        if (annule) return
        if (!data.peutSaisir) {
          setErreur("Vous n'avez pas les droits pour consulter les prix d'achat.")
          return
        }
        appliquerDonnees(data)
      })
      .catch(() => !annule && setErreur('Impossible de charger les lignes du chantier.'))
      .finally(() => !annule && setChargement(false))
    return () => {
      annule = true
    }
  }, [open, chantierId, appliquerDonnees])

  const modifier = (id: number, champ: keyof Edition, valeur: string) => {
    setEditions((e) => ({ ...e, [id]: { ...e[id], [champ]: valeur } }))
    setMessageSucces(null)
  }

  const suggestions = lignes.filter(
    (l) => l.categorieSuggeree && !editions[l.ligneCommandeId]?.categorie
  )

  const appliquerSuggestions = () => {
    setEditions((e) => {
      const suivant = { ...e }
      for (const l of suggestions) {
        suivant[l.ligneCommandeId] = {
          ...suivant[l.ligneCommandeId],
          categorie: l.categorieSuggeree as string,
        }
      }
      return suivant
    })
    setMessageSucces(null)
  }

  /** Recopie un prix sur les lignes de même catégorie encore vides. */
  const recopierPrix = (categorie: string, prix: string) => {
    setEditions((e) => {
      const suivant = { ...e }
      for (const l of lignes) {
        const ed = suivant[l.ligneCommandeId]
        if (ed && ed.categorie === categorie && !ed.prix) {
          suivant[l.ligneCommandeId] = { ...ed, prix }
        }
      }
      return suivant
    })
    setMessageSucces(null)
  }

  const aTraiter = lignes.filter((l) => !editions[l.ligneCommandeId]?.categorie).length

  const enregistrer = async () => {
    setEnregistrement(true)
    setErreur(null)
    try {
      const payload = lignes.map((l) => ({
        ligneCommandeId: l.ligneCommandeId,
        categorieMateriau: editions[l.ligneCommandeId]?.categorie || null,
        coutMatiereM2: editions[l.ligneCommandeId]?.prix || null,
      }))
      const res = await fetch(`/api/chantiers/${chantierId}/cout-matiere`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes: payload, poseUniquement }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Enregistrement refusé')
      appliquerDonnees(data)
      setMessageSucces(`${data.lignesEnregistrees} ligne(s) enregistrée(s).`)
      onSaved?.()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                {/* En-tête */}
                <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      Coût matière
                    </Dialog.Title>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {etatNumero != null
                        ? `Quantités de l’état d’avancement n° ${etatNumero}`
                        : 'Aucun état d’avancement'}
                      {' · '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatEuro(total)} estimés
                      </span>
                      {poseUniquement && (
                        <span className="ml-1 text-blue-600 dark:text-blue-400">
                          · pose seule
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                  {chargement ? (
                    <div className="flex h-40 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                  ) : erreur && lignes.length === 0 ? (
                    <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erreur}</p>
                  ) : lignes.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune ligne facturée pour l’instant : le coût matière se calcule sur les
                      quantités d’un état d’avancement. Encodez un état, puis revenez ici.
                    </p>
                  ) : (
                    <>
                      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700">
                        <input
                          type="checkbox"
                          checked={poseUniquement}
                          onChange={(e) => {
                            setPoseUniquement(e.target.checked)
                            setMessageSucces(null)
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Chantier en pose uniquement
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            Le carrelage est fourni par le client : on ne compte que la
                            main-d’œuvre et les consommables (colle, joint, silicone, clips).
                            Le coût matière est alors complet sans prix d’achat.
                          </span>
                        </span>
                      </label>

                      {!poseUniquement && suggestions.length > 0 && (
                        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/30">
                          <SparklesIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-800 dark:text-blue-200">
                            {suggestions.length} catégorie(s) détectée(s) depuis les libellés
                          </span>
                          <button
                            type="button"
                            onClick={appliquerSuggestions}
                            className="ml-auto rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Appliquer
                          </button>
                        </div>
                      )}

                      {/* Tableau — desktop */}
                      <div className="hidden overflow-x-auto sm:block">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Description
                              </th>
                              <th className="w-24 px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Quantité
                              </th>
                              <th className="w-40 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Catégorie
                              </th>
                              <th className="w-44 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Prix d’achat €/m²
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {lignes.map((l) => {
                              const ed = editions[l.ligneCommandeId] || { categorie: '', prix: '' }
                              const alerte = estCategorieMateriau(ed.categorie)
                                ? verifierUniteCategorie(ed.categorie, l.unite)
                                : null
                              const horsMatiere = ed.categorie === CATEGORIE_AUCUNE
                              const peutRecopier =
                                !poseUniquement &&
                                estCategorieMateriau(ed.categorie) &&
                                !!ed.prix &&
                                lignes.some(
                                  (a) =>
                                    a.ligneCommandeId !== l.ligneCommandeId &&
                                    editions[a.ligneCommandeId]?.categorie === ed.categorie &&
                                    !editions[a.ligneCommandeId]?.prix
                                )
                              return (
                                <tr
                                  key={l.ligneCommandeId}
                                  className={alerte ? 'bg-amber-50 dark:bg-amber-900/20' : undefined}
                                >
                                  <td className="px-2 py-2 align-top">
                                    <div
                                      className={
                                        horsMatiere
                                          ? 'text-gray-400 dark:text-gray-500'
                                          : 'text-gray-900 dark:text-gray-100'
                                      }
                                    >
                                      {l.description || l.article}
                                    </div>
                                    {alerte && (
                                      <div className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                                        <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>{alerte} — le montant calculé n’aurait pas de sens.</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-2 text-right align-top text-gray-500 dark:text-gray-400">
                                    {l.quantite} {l.unite}
                                  </td>
                                  <td className="px-2 py-2 align-top">
                                    <select
                                      value={ed.categorie}
                                      onChange={(e) =>
                                        modifier(l.ligneCommandeId, 'categorie', e.target.value)
                                      }
                                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    >
                                      <option value="">À traiter…</option>
                                      {CATEGORIES_MATERIAU.map((c) => (
                                        <option key={c} value={c}>
                                          {LIBELLES_CATEGORIE[c]}
                                        </option>
                                      ))}
                                      <option value={CATEGORIE_AUCUNE}>
                                        {LIBELLES_CATEGORIE[CATEGORIE_AUCUNE]}
                                      </option>
                                    </select>
                                    {l.categorieSuggeree && !ed.categorie && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          modifier(
                                            l.ligneCommandeId,
                                            'categorie',
                                            l.categorieSuggeree as string
                                          )
                                        }
                                        className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                                      >
                                        Proposé : {LIBELLES_CATEGORIE[l.categorieSuggeree]}
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 align-top">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={ed.prix}
                                      disabled={poseUniquement || !estCategorieMateriau(ed.categorie)}
                                      placeholder={
                                        poseUniquement ? 'fourni' : horsMatiere ? '—' : '0,00'
                                      }
                                      onChange={(e) =>
                                        modifier(l.ligneCommandeId, 'prix', e.target.value)
                                      }
                                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-right text-sm disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                                    />
                                    {peutRecopier && (
                                      <button
                                        type="button"
                                        onClick={() => recopierPrix(ed.categorie, ed.prix)}
                                        className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                                      >
                                        Appliquer aux {LIBELLES_CATEGORIE[ed.categorie]?.toLowerCase()} vides
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cartes — mobile */}
                      <div className="space-y-3 sm:hidden">
                        {lignes.map((l) => {
                          const ed = editions[l.ligneCommandeId] || { categorie: '', prix: '' }
                          const alerte = estCategorieMateriau(ed.categorie)
                            ? verifierUniteCategorie(ed.categorie, l.unite)
                            : null
                          return (
                            <div
                              key={l.ligneCommandeId}
                              className={`rounded-lg border p-3 ${
                                alerte
                                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {l.description || l.article}
                              </div>
                              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {l.quantite} {l.unite}
                              </div>
                              {alerte && (
                                <div className="mt-2 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                                  <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>{alerte}</span>
                                </div>
                              )}
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <select
                                  value={ed.categorie}
                                  onChange={(e) => modifier(l.ligneCommandeId, 'categorie', e.target.value)}
                                  className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                  <option value="">À traiter…</option>
                                  {CATEGORIES_MATERIAU.map((c) => (
                                    <option key={c} value={c}>
                                      {LIBELLES_CATEGORIE[c]}
                                    </option>
                                  ))}
                                  <option value={CATEGORIE_AUCUNE}>
                                    {LIBELLES_CATEGORIE[CATEGORIE_AUCUNE]}
                                  </option>
                                </select>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={ed.prix}
                                  disabled={poseUniquement || !estCategorieMateriau(ed.categorie)}
                                  placeholder={poseUniquement ? 'fourni' : '€/m²'}
                                  onChange={(e) => modifier(l.ligneCommandeId, 'prix', e.target.value)}
                                  className="rounded-md border border-gray-300 bg-white px-2 py-2 text-right text-sm disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Pied */}
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {aTraiter > 0
                      ? `${aTraiter} ligne(s) encore à traiter`
                      : 'Toutes les lignes sont traitées'}
                  </div>
                  {messageSucces && (
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">
                      {messageSucces}
                    </div>
                  )}
                  {erreur && lignes.length > 0 && (
                    <div className="text-xs font-medium text-red-600 dark:text-red-400">{erreur}</div>
                  )}
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={enregistrer}
                      disabled={enregistrement || lignes.length === 0}
                      className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
