import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Interface pour le chantier retourné par la requête SQL
interface ChantierSql {
  chantierId: string;
  nomChantier: string;
  dateDebut: string | Date | null;
  dateFinPrevue: string | Date | null;
  dureeEnJours: number | null;
  statut: string;
  adresseChantier: string | null;
  typeDuree: string;
  clientNom: string | null;
  clientEmail: string | null;
  clientAdresse: string | null;
}

// Fonction pour calculer la date de fin selon le type de durée
function calculerDateFin(dateDebut: Date, duree: number, typeDuree: string): Date {
  const dateFin = new Date(dateDebut);
  
  if (typeDuree === 'OUVRABLE') {
    // Ajouter uniquement les jours ouvrables (Lundi-Vendredi)
    let joursAjoutes = 0;
    while (joursAjoutes < duree) {
      dateFin.setDate(dateFin.getDate() + 1);
      // 0 = Dimanche, 6 = Samedi
      const jourSemaine = dateFin.getDay();
      if (jourSemaine !== 0 && jourSemaine !== 6) {
        joursAjoutes++;
      }
    }
  } else {
    // Ajouter simplement le nombre de jours calendaires
    dateFin.setDate(dateFin.getDate() + duree);
  }
  
  return dateFin;
}

// GET /api/planning/chantiers - Récupère les chantiers pour le planning Gantt
export async function GET() {
  try {
    // Récupérer les chantiers avec les données du client en utilisant une requête brute
    // pour éviter les problèmes de schéma Prisma
    const chantiers = await prisma.$queryRaw<ChantierSql[]>`
      SELECT c.*, 
             cl.nom as clientNom, 
             cl.email as clientEmail, 
             cl.adresse as clientAdresse
      FROM Chantier c
      LEFT JOIN Client cl ON c.clientId = cl.id
      ORDER BY c.createdAt DESC
    `;

    console.log('Données brutes reçues:', chantiers)

    // Transformer les données pour correspondre à l'interface Chantier du component GanttChart
    const formattedChantiers = chantiers.map((chantier: ChantierSql) => {
      // Utiliser dateDebut comme date de début ou date actuelle si non définie
      const startDate = chantier.dateDebut ? new Date(chantier.dateDebut) : new Date();
      
      // Déterminer la date de fin
      let endDate;
      // Si dateFinPrevue est définie, l'utiliser en priorité
      if (chantier.dateFinPrevue) {
        endDate = new Date(chantier.dateFinPrevue);
      } 
      // Sinon calculer la date de fin en fonction de la durée et du type de durée
      else if (chantier.dureeEnJours) {
        endDate = calculerDateFin(
          startDate, 
          Number(chantier.dureeEnJours), 
          chantier.typeDuree || 'CALENDRIER'
        );
      } 
      // Si aucune durée n'est définie, utiliser 30 jours calendrier par défaut
      else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 30);
      }
      
      // Mapper l'état du chantier aux états attendus par le composant
      let etat = 'En préparation';
      if (chantier.statut === 'EN_COURS') {
        etat = 'En cours';
      } else if (chantier.statut === 'TERMINE') {
        etat = 'Terminé';
      }

      // Calculer la durée en jours
      const dureeEnJours = chantier.dureeEnJours || Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Chantier ${chantier.chantierId}:`, {
        dateDebut: startDate.toISOString(),
        dureeEnJours: dureeEnJours,
        typeDuree: chantier.typeDuree || 'CALENDRIER',
        endDate: endDate.toISOString()
      });

      return {
        id: chantier.chantierId,
        title: chantier.nomChantier,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        client: chantier.clientNom || 'Sans client',
        etat: etat,
        adresse: chantier.adresseChantier || '',
        dureeEnJours: dureeEnJours,
        typeDuree: chantier.typeDuree || 'CALENDRIER'
      }
    });

    console.log('Données formatées:', formattedChantiers)

    return NextResponse.json(formattedChantiers)
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
} 