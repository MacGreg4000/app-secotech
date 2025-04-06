import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { Prisma } from '@prisma/client'

// Récupérer les bons de régie, avec limite optionnelle
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // Convertir le paramètre limit en nombre, ou utiliser null si non fourni
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // Utiliser $queryRaw pour éviter les problèmes avec le nom du modèle
    let bonsRegie;
    if (limit) {
      bonsRegie = await prisma.$queryRaw`
        SELECT * FROM bonRegie 
        ORDER BY createdAt DESC 
        LIMIT ${limit}
      `;
    } else {
      bonsRegie = await prisma.$queryRaw`
        SELECT * FROM bonRegie 
        ORDER BY createdAt DESC
      `;
    }
    
    return NextResponse.json(bonsRegie)
  } catch (error) {
    console.error('Erreur lors de la récupération des bons de régie:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la récupération des bons de régie' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Ajouter un bon de régie
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validation de base des données
    if (!data.client || !data.nomChantier || !data.description || !data.tempsChantier || !data.materiaux || !data.signature || !data.nomSignataire) {
      return new NextResponse(
        JSON.stringify({ error: 'Données incomplètes' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const now = new Date();
    const dateSignature = new Date(data.dateSignature);
    
    // Utiliser $executeRaw pour l'insertion
    await prisma.$executeRaw`
      INSERT INTO bonRegie (
        dates, client, nomChantier, description, 
        tempsChantier, nombreTechniciens, 
        materiaux, nomSignataire, 
        signature, dateSignature, createdAt, updatedAt
      ) VALUES (
        ${data.dates || ''}, 
        ${data.client}, 
        ${data.nomChantier}, 
        ${data.description},
        ${data.tempsChantier}, 
        ${data.nombreTechniciens || null}, 
        ${data.materiaux}, 
        ${data.nomSignataire},
        ${data.signature}, 
        ${dateSignature}, 
        ${now}, 
        ${now}
      )
    `;
    
    // Récupérer le dernier enregistrement inséré
    const result = await prisma.$queryRaw`
      SELECT * FROM bonRegie 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    const bonRegie = Array.isArray(result) && result.length > 0 
      ? result[0] 
      : null;
    
    if (!bonRegie) {
      throw new Error('Échec de la récupération du bon de régie créé');
    }
    
    return NextResponse.json(bonRegie)
  } catch (error) {
    console.error('Erreur lors de la création du bon de régie:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la création du bon de régie' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 