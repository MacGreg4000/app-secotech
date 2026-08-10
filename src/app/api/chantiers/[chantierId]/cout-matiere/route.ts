// Coût matière estimé d'un chantier, pour l'écran « Résumé financier ».
//
// CardFinancialSummary est un composant client : il ne peut pas importer
// la librairie de calcul, qui utilise Prisma. D'où cette route, appelée comme
// les quatre autres qu'il consomme déjà.
//
// Même librairie que les outils MCP (src/lib/rentabilite/calcul.ts) : une seule
// formule, pas de duplication entre l'interface et l'agent.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { calculerCoutMatiereChantier } from '@/lib/rentabilite/calcul'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  const { chantierId } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Le paramètre d'URL est le slug métier ; le calcul travaille sur le cuid.
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true },
    })
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const resultat = await calculerCoutMatiereChantier(chantier.id)
    return NextResponse.json(resultat)
  } catch (error) {
    console.error('Erreur calcul du coût matière:', error)
    // On renvoie un coût nul plutôt qu'une erreur : l'écran financier ne doit
    // jamais devenir inutilisable à cause de cette estimation additionnelle.
    return NextResponse.json({
      coutMatiereTotal: 0,
      detailParCategorie: {},
      lignes: [],
      avertissements: ['Le coût matière n’a pas pu être calculé.'],
    })
  }
}
