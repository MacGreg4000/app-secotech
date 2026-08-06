// Dispatch unique des outils agent.
//
// Corps : { tool, args?, dryRun?, idempotencyKey? }
//
// Codes HTTP :
//   401 clé absente/invalide · 400 corps malformé · 500 exception inattendue
// Les échecs MÉTIER sortent en 200 avec { ok: false } : c'est une donnée
// exploitable par le modèle, pas une erreur de transport.
import { NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent/auth'
import { executeTool, getTool, parseToolArgs } from '@/lib/agent/tools'
import { getIdempotent, setIdempotent } from '@/lib/agent/idempotency'
import { toToolJSON } from '@/lib/agent/serialize'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const identity = await requireAgentAuth(request)
  if (!identity) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const toolName = typeof body.tool === 'string' ? body.tool.trim() : ''
  if (!toolName) {
    return NextResponse.json({ error: 'Champ « tool » requis' }, { status: 400 })
  }
  if (!getTool(toolName)) {
    return NextResponse.json({ error: `Outil inconnu : ${toolName}` }, { status: 400 })
  }

  const args = parseToolArgs(body.args as Record<string, unknown> | string | undefined)
  const dryRun = body.dryRun === true
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : null

  // Rejeu d'une exécution réelle déjà aboutie (jamais pour un dry-run)
  if (idempotencyKey && !dryRun) {
    const cached = getIdempotent(toolName, idempotencyKey)
    if (cached !== undefined) {
      return NextResponse.json({
        ok: true,
        tool: toolName,
        result: toToolJSON(cached),
        durationMs: 0,
        rejeu: true,
      })
    }
  }

  const started = Date.now()
  try {
    const result = await executeTool(toolName, args, { userId: identity.userId }, { dryRun })
    const durationMs = Date.now() - started

    // Convention des outils : un objet portant « erreur » est un échec métier
    const ok = !(result && typeof result === 'object' && 'erreur' in (result as object))

    if (ok && idempotencyKey && !dryRun) {
      setIdempotent(toolName, idempotencyKey, result)
    }

    // Journal : jamais la clé, jamais le corps complet (données client)
    console.log(
      `[agent] ${toolName} key=${identity.keyLabel} dryRun=${dryRun} ok=${ok} ${durationMs}ms`
    )

    return NextResponse.json({
      ok,
      tool: toolName,
      result: toToolJSON(result),
      durationMs,
    })
  } catch (error) {
    // executeTool absorbe déjà les erreurs d'outil : on n'arrive ici que sur
    // une défaillance inattendue du dispatcher lui-même.
    console.error(`[agent] exception dispatcher ${toolName}:`, error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
