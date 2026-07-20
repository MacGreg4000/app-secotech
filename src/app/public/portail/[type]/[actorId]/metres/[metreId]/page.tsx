'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../../i18n'

interface LigneInput {
  id?: string
  ligneCommandeId?: number
  description: string
  type?: string
  unite: string
  prixUnitaire: number
  quantite: number
  estSupplement?: boolean
}

interface MetreDetail {
  id: string
  statut: string
  commentaire: string | null
  piecesJointes: string[] | null
  modifiable: boolean
  chantier: { chantierId: string; nomChantier: string }
  lignes: LigneInput[]
}

const STATUTS_MODIFIABLES = ['BROUILLON', 'SOUMIS', 'REJETE']

function EditMetrePage({ params }: { params: { type: 'ouvrier'|'soustraitant'; actorId: string; metreId: string } }) {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [metre, setMetre] = useState<MetreDetail | null>(null)
  const [lignes, setLignes] = useState<LigneInput[]>([])
  const [commentaire, setCommentaire] = useState('')
  const [existingPieces, setExistingPieces] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setFetching(true)
        const res = await fetch(`/api/public/portail/${params.type}/${params.actorId}/metres/${params.metreId}`, { credentials: 'include' })
        if (!res.ok) throw new Error('not found')
        const json = await res.json()
        setMetre(json)
        setLignes(Array.isArray(json.lignes) ? json.lignes : [])
        setCommentaire(json.commentaire || '')
        setExistingPieces(Array.isArray(json.piecesJointes) ? json.piecesJointes : [])
      } catch {
        setError('Impossible de charger ce métré.')
      } finally {
        setFetching(false)
      }
    })()
  }, [params.type, params.actorId, params.metreId])

  const readOnly = !!metre && !STATUTS_MODIFIABLES.includes(metre.statut)
  const total = useMemo(() => lignes.reduce((s, l) => s + (l.prixUnitaire * (l.quantite || 0)), 0), [lignes])

  const addSupplement = () => {
    setLignes(prev => [...prev, { description: '', unite: 'U', prixUnitaire: 0, quantite: 0, estSupplement: true }])
  }

  const removeLine = (idx: number) => {
    setLignes(prev => prev.filter((_, i) => i !== idx))
  }

  const removeExistingPiece = (idx: number) => {
    setExistingPieces(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setFiles(Array.from(e.target.files))
  }

  const submit = async (statut: 'SOUMIS' | 'BROUILLON') => {
    try {
      setError(null)
      if (statut === 'BROUILLON') setSavingDraft(true)
      else setLoading(true)

      const newPieces: string[] = []
      for (const f of files) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(f)
        })
        newPieces.push(dataUrl)
      }

      const res = await fetch(`/api/public/portail/${params.type}/${params.actorId}/metres/${params.metreId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut,
          commentaire,
          lignes,
          piecesJointes: [...existingPieces, ...newPieces],
        })
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t)
      }
      router.push(`/public/portail/${params.type}/${params.actorId}?metre=ok`)
    } catch {
      setError('Enregistrement impossible. Vérifiez vos données.')
    } finally {
      setLoading(false)
      setSavingDraft(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-white/90 hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1"/>
              {t('back')}
            </button>
            <div className="ml-auto font-medium">{t('edit_metre')}</div>
          </div>
        </div>

        {fetching ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-8 text-center text-sm text-gray-500">{t('loading')}</div>
        ) : !metre ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-8 text-center text-sm text-red-600">{error || t('error')}</div>
        ) : (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4 lg:p-6">
            {readOnly && (
              <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {t('locked_metre_message')}
              </div>
            )}

            <label className="block text-sm font-medium mb-1 text-gray-700">{t('chantier_label')}</label>
            <div className="w-full border border-gray-200 rounded-lg p-2 mb-4 bg-gray-50 text-gray-700">
              {metre.chantier.nomChantier}
            </div>

            {/* Lignes */}
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full text-sm border border-gray-200 min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left text-xs font-medium text-gray-700">{t('table_description')}</th>
                      <th className="p-2 text-xs font-medium text-gray-700">{t('table_unit')}</th>
                      <th className="p-2 text-xs font-medium text-gray-700">{t('table_unit_price')}</th>
                      <th className="p-2 text-xs font-medium text-gray-700">{t('table_quantity')}</th>
                      <th className="p-2 text-xs font-medium text-gray-700">{t('table_total')}</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, idx) => (
                      <tr key={l.id ?? idx} className="border-t border-gray-200">
                        <td className="p-2">
                          <input disabled={readOnly} className="w-full border border-gray-300 rounded p-1.5 text-sm bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" value={l.description} onChange={e => {
                            const v = e.target.value; setLignes(prev => prev.map((x,i)=> i===idx?{...x, description:v}:x))
                          }} />
                        </td>
                        <td className="p-2 w-24">
                          <select
                            disabled={readOnly}
                            className="w-full border border-gray-300 rounded p-1.5 text-sm text-center bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            value={l.unite}
                            onChange={e => {
                              const v = e.target.value; setLignes(prev => prev.map((x,i)=> i===idx?{...x, unite:v}:x))
                            }}
                          >
                            <option value="Mct">Mct</option>
                            <option value="M²">M²</option>
                            <option value="M³">M³</option>
                            <option value="Heures">Heures</option>
                            <option value="Pièces">Pièces</option>
                            <option value="Fft">Forfait</option>
                            <option value="U">U</option>
                            <option value="m">m</option>
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                          </select>
                        </td>
                        <td className="p-2 w-24">
                          <input disabled={readOnly} type="number" className="w-full border border-gray-300 rounded p-1.5 text-sm text-right bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" value={l.prixUnitaire} onChange={e => {
                            const v = Number(e.target.value||0); setLignes(prev => prev.map((x,i)=> i===idx?{...x, prixUnitaire:v}:x))
                          }} />
                        </td>
                        <td className="p-2 w-24">
                          <input disabled={readOnly} type="number" className="w-full border border-gray-300 rounded p-1.5 text-sm text-right bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" value={l.quantite} onChange={e => {
                            const v = Number(e.target.value||0); setLignes(prev => prev.map((x,i)=> i===idx?{...x, quantite:v}:x))
                          }} />
                        </td>
                        <td className="p-2 w-24 text-right text-sm font-medium text-gray-900">{(l.prixUnitaire * (l.quantite||0)).toFixed(2)} €</td>
                        <td className="p-2 w-10 text-center">
                          {!readOnly && l.estSupplement && (
                            <button onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-800 text-xs font-medium" title={t('remove_line')}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!readOnly && (
                <div className="mt-3 flex gap-2">
                  <button onClick={addSupplement} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                    {t('add_supplement')}
                  </button>
                </div>
              )}
            </div>

            {/* Commentaire */}
            <label className="block text-sm font-medium mt-6 mb-1 text-gray-700">{t('comment_label')}</label>
            <textarea disabled={readOnly} className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" rows={4} value={commentaire} onChange={e=>setCommentaire(e.target.value)} />

            {/* Pièces jointes existantes */}
            {existingPieces.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2 text-gray-700">{t('attach_photos')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {existingPieces.map((pj, idx) => (
                    <div key={idx} className="relative">
                      <img src={pj} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                      {!readOnly && (
                        <button onClick={() => removeExistingPiece(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!readOnly && (
              <>
                <label className="block text-sm font-medium mt-6 mb-1 text-gray-700">{t('attach_photos')}</label>
                <input type="file" accept="image/*" multiple onChange={handleFiles} className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </>
            )}

            {/* Total */}
            <div className="mt-4 text-right font-semibold text-gray-900">{t('estimated_total')}: {total.toFixed(2)} €</div>

            {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

            {!readOnly && (
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <button disabled={loading || savingDraft || lignes.length===0} onClick={() => submit('SOUMIS')} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors">
                  {loading? t('sending') : (metre.statut === 'REJETE' ? t('resubmit') : t('submit'))}
                </button>
                <button disabled={loading || savingDraft || lignes.length===0} onClick={() => submit('BROUILLON')} className="px-4 py-2 rounded-lg border border-blue-300 bg-white text-blue-700 disabled:opacity-50 hover:bg-blue-50 transition-colors">
                  {savingDraft? t('saving_draft') : t('save_draft')}
                </button>
                <button onClick={()=>router.back()} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">{t('cancel')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditMetrePageWrapper(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string; metreId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <EditMetrePage params={p} />
    </PortalI18nProvider>
  )
}
