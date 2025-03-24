import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('API Test route with params called:', params);
  return NextResponse.json({ 
    message: 'Test API avec paramètres fonctionne!',
    params: params
  })
} 