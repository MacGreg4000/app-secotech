export async function getChantiers() {
  const res = await fetch('/api/chantiers')
  if (!res.ok) throw new Error('Erreur lors de la récupération des chantiers')
  return res.json()
} 