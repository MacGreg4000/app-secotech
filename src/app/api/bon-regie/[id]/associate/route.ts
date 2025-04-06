import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// Associer un bon de régie à un chantier
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Utiliser await pour déballer les paramètres
    const paramsData = await params
    const id = parseInt(paramsData.id, 10)
    
    if (isNaN(id)) {
      return new NextResponse(
        JSON.stringify({ error: 'ID de bon de régie invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const data = await request.json()
    
    // Vérifier que le chantierId est fourni
    if (!data.chantierId) {
      return new NextResponse(
        JSON.stringify({ error: 'ID de chantier non fourni' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: data.chantierId }
    })
    
    if (!chantier) {
      return new NextResponse(
        JSON.stringify({ error: 'Chantier introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Mettre à jour le bon de régie en utilisant $queryRaw
    await prisma.$executeRaw`
      UPDATE bonRegie 
      SET chantierId = ${data.chantierId} 
      WHERE id = ${id}
    `;

    // Récupérer le bon de régie mis à jour
    const result = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${id}
    `;
    
    // TypeScript ne connaît pas le type exact, donc on cast le résultat
    const updatedBonRegie = Array.isArray(result) && result.length > 0 
      ? result[0] 
      : { id, chantierId: data.chantierId };
    
    return NextResponse.json(updatedBonRegie)
  } catch (error) {
    console.error('Erreur lors de l\'association du bon au chantier:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de l\'association du bon au chantier' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 