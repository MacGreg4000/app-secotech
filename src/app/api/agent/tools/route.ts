// Catalogue des outils agent — consommé au démarrage par le serveur MCP.
// Auth : clé d'API uniquement (X-API-Key). Pas de session NextAuth ici.
import { NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent/auth'
import { getToolCatalog } from '@/lib/agent/tools'

export const dynamic = 'force-dynamic'

/** Version du contrat. Changements additifs tant qu'on reste en "1". */
const CONTRACT_VERSION = '1'

export async function GET(request: Request) {
  const identity = await requireAgentAuth(request)
  if (!identity) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return NextResponse.json({
    version: CONTRACT_VERSION,
    tools: getToolCatalog(),
  })
}
