// Marges de plusieurs chantiers, pour le badge de la liste.
//
// Endpoint SÉPARÉ volontairement : le calcul demande plusieurs requêtes par
// chantier. L'intégrer à /api/chantiers ralentirait une page centrale à chaque
// chargement. Ici la liste s'affiche d'abord, les badges arrivent ensuite.
//
// Bornée à 30 chantiers par appel — la liste en pagine 25.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { calculerRentabiliteChantier } from '@/lib/rentabilite/calcul'

export const dynamic = 'force-dynamic'

const MAX_CHANTIERS = 30

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const url = new URL(request.url)
    const slugs = (url.searchParams.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_CHANTIERS)

    if (slugs.length === 0) return NextResponse.json({ marges: {} })

    const chantiers = await prisma.chantier.findMany({
      where: { chantierId: { in: slugs } },
      select: { id: true, chantierId: true, nomChantier: true },
    })

    const marges: Record<
      string,
      { margin: number; netResult: number; totalRevenue: number; matiereIncomplete: boolean }
    > = {}
    for (const c of chantiers) {
      try {
        const r = await calculerRentabiliteChantier(c.id, c.chantierId, c.nomChantier)
        // Sans facturation, la marge n'a pas de sens : on n'affiche pas de badge.
        if (r.totalRevenue > 0) {
          marges[c.chantierId] = {
            margin: r.margin,
            netResult: r.netResult,
            totalRevenue: r.totalRevenue,
            // La marge est surévaluée tant que des lignes n'ont pas de coût
            // matière : le badge doit le dire plutôt que d'afficher un chiffre
            // net qui inspire une confiance qu'il ne mérite pas.
            matiereIncomplete: r.matiereIncomplete,
          }
        }
      } catch (e) {
        console.error('Marge non calculée pour', c.chantierId, e)
      }
    }

    return NextResponse.json({ marges })
  } catch (error) {
    console.error('Erreur calcul des marges:', error)
    // Jamais d'erreur bloquante : la liste doit rester utilisable sans badge.
    return NextResponse.json({ marges: {} })
  }
}
