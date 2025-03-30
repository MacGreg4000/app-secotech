'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, use } from 'react';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import LigneCommande from '@/components/commande/LigneCommande'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import SelectField from '@/components/ui/SelectField'

interface CommandePageProps {
  params: Promise<{
    chantierId: string
  }>
}

// Types pour la commande
interface LigneCommande {
  id: number;
  commandeId?: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
  estOption: boolean;
}

interface Commande {
  id?: number;
  chantierId: string;
  clientId: string | null;
  clientNom?: string | null;
  dateCommande: Date;
  reference: string | null;
  tauxTVA: number;
  lignes: LigneCommande[];
  sousTotal: number;
  totalOptions: number;
  tva: number;
  total: number;
  statut: string;
  estVerrouillee?: boolean;
}

export default function CommandePage(props: CommandePageProps) {
  const params = use(props.params);
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [commande, setCommande] = useState<Commande>({
    chantierId: params.chantierId,
    clientId: null,
    clientNom: null,
    dateCommande: new Date(),
    reference: null,
    tauxTVA: 21,
    lignes: [],
    sousTotal: 0,
    totalOptions: 0,
    tva: 0,
    total: 0,
    statut: 'brouillon'
  })
  const [chantier, setChantier] = useState<any>(null)

  // Force le taux de TVA à 0% au premier rendu
  useEffect(() => {
    console.log('Initialisation forcée du taux de TVA à 0%');
    setCommande(prev => ({
      ...prev,
      tauxTVA: 0,
      tva: 0,
      total: prev.sousTotal // Total sans TVA
    }));
  }, []);

  console.log('État actuel de la commande:', commande)

  // Fonction pour charger les données
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Vérifier si un ID de commande est présent dans l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const commandeId = urlParams.get('id');
      
      // Récupérer le chantier
      const chantierResponse = await fetch(`/api/chantiers/${params.chantierId}`);
      if (!chantierResponse.ok) {
        throw new Error('Erreur lors de la récupération du chantier');
      }
      const chantierData = await chantierResponse.json();
      console.log('Données du chantier chargées:', chantierData);
      
      // Récupérer le client
      let clientNom = null;
      let clientId = null;
      if (chantierData.clientId) {
        clientId = chantierData.clientId;
        const clientResponse = await fetch(`/api/clients/${chantierData.clientId}`);
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          clientNom = clientData.nom;
          console.log('Client associé au chantier:', clientData);
        } else {
          console.error('Erreur lors de la récupération du client:', await clientResponse.text());
        }
      } else {
        console.warn('Aucun client associé au chantier');
      }
      
      // Initialiser une nouvelle commande par défaut
      let newCommande: Commande = {
        chantierId: params.chantierId,
        clientId: clientId,
        clientNom: clientNom,
        dateCommande: new Date(),
        reference: null,
        tauxTVA: 0,
        lignes: [],
        sousTotal: 0,
        totalOptions: 0,
        tva: 0,
        total: 0,
        statut: 'BROUILLON',
        estVerrouillee: false
      };
      
      // Si un ID de commande est spécifié dans l'URL, récupérer cette commande spécifique
      if (commandeId) {
        try {
          console.log('Récupération de la commande spécifique avec ID:', commandeId);
          const commandeResponse = await fetch(`/api/commandes/${commandeId}`);
          
          if (commandeResponse.ok) {
            const commande = await commandeResponse.json();
            console.log('Commande spécifique récupérée:', commande);
            
            // Récupérer les lignes de la commande
            const lignesResponse = await fetch(`/api/commandes/${commandeId}/lignes`);
            
            if (lignesResponse.ok) {
              const lignes = await lignesResponse.json();
              console.log('Lignes récupérées:', lignes);
              
              // Mettre à jour l'état avec les données récupérées
              newCommande = {
                id: commande.id,
                chantierId: params.chantierId,
                clientId: commande.clientId || clientId,
                clientNom: clientNom,
                dateCommande: new Date(commande.dateCommande),
                reference: commande.reference,
                tauxTVA: commande.tauxTVA || 0,
                lignes: lignes.map((ligne: any) => ({
                  id: ligne.id,
                  commandeId: ligne.commandeId,
                  ordre: ligne.ordre,
                  article: ligne.article,
                  description: ligne.description,
                  type: ligne.type,
                  unite: ligne.unite,
                  prixUnitaire: ligne.prixUnitaire,
                  quantite: ligne.quantite,
                  total: ligne.total,
                  estOption: ligne.estOption
                })),
                sousTotal: commande.sousTotal,
                totalOptions: commande.totalOptions,
                tva: commande.tva,
                total: commande.total,
                statut: commande.statut,
                estVerrouillee: commande.estVerrouillee
              };
              
              // Mettre à jour l'état de verrouillage en fonction du statut de la commande
              setIsLocked(commande.estVerrouillee || commande.statut === 'VALIDEE');
            } else {
              console.error('Erreur lors de la récupération des lignes:', await lignesResponse.text());
            }
          } else {
            console.error('Erreur lors de la récupération de la commande spécifique:', await commandeResponse.text());
          }
        } catch (error) {
          console.error('Erreur lors de la récupération de la commande spécifique:', error);
        }
      } else {
        // Si aucun ID spécifique n'est fourni, récupérer la dernière commande pour ce chantier
        try {
          console.log('Récupération de la dernière commande pour le chantier');
          const commandeResponse = await fetch(`/api/chantiers/${params.chantierId}/commandes`);
          
          if (commandeResponse.ok) {
            const commandes = await commandeResponse.json();
            console.log('Commandes récupérées:', commandes);
            
            if (commandes && commandes.length > 0) {
              // Trier les commandes par ID pour obtenir la plus récente
              const derniereCommande = commandes[0]; // Déjà triées par date desc dans l'API
              console.log('Dernière commande chargée:', derniereCommande);
              
              try {
                // Récupérer les lignes de la commande
                const lignesResponse = await fetch(`/api/commandes/${derniereCommande.id}/lignes`);
                
                if (lignesResponse.ok) {
                  const lignes = await lignesResponse.json();
                  console.log('Lignes récupérées:', lignes);
                  
                  // Mettre à jour l'état avec les données récupérées
                  newCommande = {
                    id: derniereCommande.id,
                    chantierId: params.chantierId,
                    clientId: derniereCommande.clientId || clientId,
                    clientNom: clientNom,
                    dateCommande: new Date(derniereCommande.dateCommande),
                    reference: derniereCommande.reference,
                    tauxTVA: derniereCommande.tauxTVA || 0,
                    lignes: lignes.map((ligne: any) => ({
                      id: ligne.id,
                      commandeId: ligne.commandeId,
                      ordre: ligne.ordre,
                      article: ligne.article,
                      description: ligne.description,
                      type: ligne.type,
                      unite: ligne.unite,
                      prixUnitaire: ligne.prixUnitaire,
                      quantite: ligne.quantite,
                      total: ligne.total,
                      estOption: ligne.estOption
                    })),
                    sousTotal: derniereCommande.sousTotal,
                    totalOptions: derniereCommande.totalOptions,
                    tva: derniereCommande.tva,
                    total: derniereCommande.total,
                    statut: derniereCommande.statut,
                    estVerrouillee: derniereCommande.estVerrouillee
                  };
                  
                  // Mettre à jour l'état de verrouillage en fonction du statut de la commande
                  setIsLocked(derniereCommande.estVerrouillee || derniereCommande.statut === 'VALIDEE');
                } else {
                  console.error('Erreur lors de la récupération des lignes:', await lignesResponse.text());
                }
              } catch (lignesError) {
                console.error('Erreur lors de la récupération des lignes:', lignesError);
              }
            } else {
              console.log('Aucune commande existante, création d\'une nouvelle commande');
            }
          } else {
            console.error('Erreur lors de la récupération des commandes:', await commandeResponse.text());
          }
        } catch (commandesError) {
          console.error('Erreur lors de la récupération des commandes:', commandesError);
        }
      }
      
      // Définir la commande (soit nouvelle, soit existante)
      console.log('Commande finale à utiliser:', newCommande);
      setCommande(newCommande);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);
    }
  };

  // Ajouter le chargement des informations du chantier
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier')
        const data = await res.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        toast.error('Erreur lors du chargement des informations du chantier')
      }
    }

    fetchChantier()
    loadData()
  }, [params.chantierId, status, router])

  // Effet pour recalculer les totaux lorsque le taux de TVA change
  useEffect(() => {
    if (commande.lignes.length > 0) {
      const { sousTotal, totalOptions, tva, total } = recalculerTotaux(commande.lignes);
      
      // Mettre à jour uniquement si les valeurs ont changé
      if (
        sousTotal !== commande.sousTotal || 
        totalOptions !== commande.totalOptions || 
        tva !== commande.tva || 
        total !== commande.total
      ) {
        setCommande(prev => ({
          ...prev,
          sousTotal,
          totalOptions,
          tva,
          total
        }));
      }
    }
  }, [commande.tauxTVA, commande.lignes]);

  const handleTVAChange = (tva: number) => {
    console.log('Taux de TVA sélectionné:', tva, typeof tva);
    
    // Forcer la conversion en nombre et s'assurer que c'est une valeur valide
    const tauxTVA = Number(tva);
    if (isNaN(tauxTVA)) {
      console.error('Taux de TVA invalide:', tva);
      return;
    }
    
    console.log('Taux de TVA converti:', tauxTVA, typeof tauxTVA);
    
    setCommande(prev => {
      // Recalculer la TVA et le total
      const newTva = (prev.sousTotal * tauxTVA) / 100;
      const newTotal = prev.sousTotal + newTva;
      
      console.log('Nouveaux calculs:', {
        sousTotal: prev.sousTotal,
        tauxTVA,
        tva: newTva,
        total: newTotal
      });
      
      return {
        ...prev,
        tauxTVA: tauxTVA,
        tva: newTva,
        total: newTotal
      }
    })
  }

  const addLigne = () => {
    // Générer un ID temporaire négatif pour éviter les conflits avec les IDs de la base de données
    const tempId = -(commande.lignes.length + 1);
    
    const newLigne: Omit<LigneCommande, 'id' | 'commandeId'> & { id: number } = {
      id: tempId,
      ordre: commande.lignes.length,
      article: '',
      description: '',
      type: 'QP',
      unite: 'Pièces',
      prixUnitaire: 0,
      quantite: 0,
      total: 0,
      estOption: false
    }

    setCommande(prev => ({
      ...prev,
      lignes: [...prev.lignes, newLigne]
    }))
  }

  // Recalculer les totaux
  const recalculerTotaux = (lignes: LigneCommande[]) => {
    const sousTotal = lignes
      .filter(l => !l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const totalOptions = lignes
      .filter(l => l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const tauxTVA = commande.tauxTVA;
    console.log('Taux TVA utilisé pour le calcul:', tauxTVA);
    
    const tva = (sousTotal * tauxTVA) / 100;
    const total = sousTotal + tva;
    
    console.log('Recalcul des totaux:', {
      sousTotal,
      totalOptions,
      tauxTVA,
      tva,
      total
    });
    
    return { sousTotal, totalOptions, tva, total };
  }

  const updateLigne = (id: number, field: string, value: any) => {
    setCommande(prev => {
      const newLignes = prev.lignes.map(ligne => {
        if (ligne.id === id) {
          const updatedLigne = { ...ligne, [field]: value }
          // Recalculer le total de la ligne
          if (field === 'prixUnitaire' || field === 'quantite') {
            updatedLigne.total = updatedLigne.prixUnitaire * updatedLigne.quantite
          }
          return updatedLigne
        }
        return ligne
      })

      // Recalculer les totaux
      const { sousTotal, totalOptions, tva, total } = recalculerTotaux(newLignes);

      return {
        ...prev,
        lignes: newLignes,
        sousTotal,
        totalOptions,
        tva,
        total
      }
    })
  }

  const deleteLigne = (id: number) => {
    setCommande(prev => {
      const newLignes = prev.lignes.filter(l => l.id !== id)
      
      // Recalculer les totaux
      const { sousTotal, totalOptions, tva, total } = recalculerTotaux(newLignes);

      return {
        ...prev,
        lignes: newLignes,
        sousTotal,
        totalOptions,
        tva,
        total
      }
    })
  }

  const moveLigne = (dragIndex: number, hoverIndex: number) => {
    setCommande(prev => {
      const newLignes = [...prev.lignes]
      const dragLigne = newLignes[dragIndex]
      newLignes.splice(dragIndex, 1)
      newLignes.splice(hoverIndex, 0, dragLigne)
      return {
        ...prev,
        lignes: newLignes.map((ligne, index) => ({ ...ligne, ordre: index }))
      }
    })
  }

  // Fonction pour sauvegarder la commande
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Vérifications de base
      if (!commande.clientId) {
        alert('Veuillez sélectionner un client avant de sauvegarder la commande.');
        return;
      }
      
      if (commande.lignes.length === 0) {
        alert('Veuillez ajouter au moins une ligne à la commande avant de sauvegarder.');
        return;
      }
      
      // Préparation des données
      const commandeData: any = {
        id: commande.id, // Inclure l'ID seulement s'il existe
        chantierId: params.chantierId,
        clientId: commande.clientId,
        dateCommande: commande.dateCommande.toISOString(),
        reference: commande.reference || null,
        tauxTVA: commande.tauxTVA || 0,
        sousTotal: commande.sousTotal || 0,
        totalOptions: commande.totalOptions || 0,
        tva: commande.tva || 0,
        total: commande.total || 0,
        statut: 'VALIDEE', // Définir directement le statut à VALIDEE
        estVerrouillee: false, // Ne pas verrouiller pour permettre des modifications ultérieures
        lignes: commande.lignes.map(ligne => ({
          id: ligne.id, // Inclure l'ID seulement s'il existe
          ordre: ligne.ordre,
          article: ligne.article || '',
          description: ligne.description || '',
          type: ligne.type || 'QP',
          unite: ligne.unite || 'Pièces',
          prixUnitaire: ligne.prixUnitaire || 0,
          quantite: ligne.quantite || 0,
          total: ligne.total || 0,
          estOption: ligne.estOption || false
        }))
      };
      
      // Supprimer les propriétés undefined
      if (!commandeData.id) delete commandeData.id;
      commandeData.lignes = commandeData.lignes.map((ligne: any) => {
        if (!ligne.id) delete ligne.id;
        return ligne;
      });
      
      console.log('Données à enregistrer:', commandeData);
      
      // Envoi de la requête
      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandeData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de l\'enregistrement:', errorText);
        throw new Error(`Erreur lors de l'enregistrement: ${errorText}`);
      }
      
      // Traitement de la réponse
      const savedCommande = await response.json();
      console.log('Commande enregistrée:', savedCommande);
      
      // Mise à jour de l'état
      setCommande({
        ...savedCommande,
        dateCommande: new Date(savedCommande.dateCommande),
        lignes: savedCommande.lignes || [],
        clientNom: commande.clientNom // Conserver le nom du client
      });
      
      // Mise à jour de l'état de verrouillage
      setIsLocked(true);
      
      // Mise à jour de l'URL
      if (savedCommande.id) {
        const url = new URL(window.location.href);
        url.searchParams.set('id', savedCommande.id.toString());
        window.history.pushState({}, '', url.toString());
      }
      
      toast.success('Commande enregistrée et validée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour rouvrir une commande verrouillée
  const handleReopenCommande = async () => {
    try {
      // Vérifier si l'utilisateur est un administrateur
      if (!session || session.user.role !== 'ADMIN') {
        alert('Seul un administrateur peut déverrouiller une commande.');
        return;
      }
      
      if (!commande.id) {
        alert('Impossible de rouvrir une commande qui n\'a pas encore été enregistrée.');
        return;
      }
      
      // Préparer les données pour la mise à jour
      const commandeData = {
        id: commande.id,
        chantierId: commande.chantierId,
        clientId: commande.clientId,
        dateCommande: commande.dateCommande.toISOString(),
        reference: commande.reference,
        tauxTVA: commande.tauxTVA,
        sousTotal: commande.sousTotal,
        totalOptions: commande.totalOptions,
        tva: commande.tva,
        total: commande.total,
        statut: 'BROUILLON',
        estVerrouillee: false,
        lignes: commande.lignes
      };
      
      console.log('Données pour réouverture:', commandeData);
      
      // Envoyer la requête pour mettre à jour la commande
      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandeData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de la réouverture:', errorText);
        throw new Error(`Erreur lors de la réouverture: ${errorText}`);
      }
      
      const updatedCommande = await response.json();
      console.log('Commande rouverte avec succès:', updatedCommande);
      
      // Mettre à jour l'état avec la commande mise à jour
      setCommande({
        ...updatedCommande,
        dateCommande: new Date(updatedCommande.dateCommande),
        lignes: updatedCommande.lignes || [],
        clientNom: commande.clientNom // Conserver le nom du client
      });
      
      // Mettre à jour l'état de verrouillage
      setIsLocked(false);
      
      alert('Commande rouverte avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Fonction pour télécharger un template Excel
  const downloadExcelTemplate = async () => {
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'Article', key: 'article', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Unité', key: 'unite', width: 10 },
      { header: 'Prix Unitaire', key: 'prixUnitaire', width: 15 },
      { header: 'Quantité', key: 'quantite', width: 10 },
      { header: 'Option', key: 'option', width: 10 }
    ];

    // Ajouter une ligne d'exemple
    worksheet.addRow({
      article: '',
      description: '',
      type: 'QP',
      unite: 'Pièces',
      prixUnitaire: 0,
      quantite: 0,
      option: 'Non'
    });

    // Générer le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Créer un blob et le télécharger
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_commande.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Référence pour l'input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour déclencher le clic sur l'input file
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fonction pour importer un fichier Excel
  const importExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Lire le fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Récupérer la première feuille
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert('Le fichier Excel est vide ou n\'a pas le bon format.');
        return;
      }

      // Récupérer les en-têtes
      const headers: Record<number, string> = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });

      // Convertir les données en lignes de commande
      const newLignes: Array<Omit<LigneCommande, 'id' | 'commandeId'>> = [];
      
      worksheet.eachRow((row, rowNumber) => {
        // Ignorer la ligne d'en-tête
        if (rowNumber === 1) return;
        
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber]] = cell.value;
        });
        
        // Vérifier si les champs obligatoires sont présents
        if (!rowData['Article'] && !rowData['Description']) {
          return;
        }
        
        newLignes.push({
          ordre: rowNumber - 2, // -2 car on ignore la ligne d'en-tête et on commence à 0
          article: rowData['Article']?.toString() || '',
          description: rowData['Description']?.toString() || '',
          type: rowData['Type']?.toString() || 'QP',
          unite: rowData['Unité']?.toString() || 'Pièces',
          prixUnitaire: Number(rowData['Prix Unitaire']) || 0,
          quantite: Number(rowData['Quantité']) || 0,
          total: (Number(rowData['Prix Unitaire']) || 0) * (Number(rowData['Quantité']) || 0),
          estOption: rowData['Option']?.toString() === 'Oui'
        });
      });

      if (newLignes.length === 0) {
        alert('Aucune ligne valide n\'a été trouvée dans le fichier.');
        return;
      }

      // Ajouter les nouvelles lignes à la commande
      setCommande(prev => {
        // Générer des IDs temporaires pour les nouvelles lignes
        const lignesWithIds = newLignes.map((ligne, index) => ({
          ...ligne,
          id: -(prev.lignes.length + index + 1) // IDs négatifs pour éviter les conflits
        }));

        // Recalculer les totaux
        const allLignes = [...prev.lignes, ...lignesWithIds];
        const { sousTotal, totalOptions, tva, total } = recalculerTotaux(allLignes);

        return {
          ...prev,
          lignes: allLignes,
          sousTotal,
          totalOptions,
          tva,
          total
        };
      });

      alert(`${newLignes.length} lignes ont été importées avec succès.`);
    } catch (error) {
      console.error('Erreur lors de l\'importation du fichier Excel:', error);
      alert('Une erreur est survenue lors de l\'importation du fichier Excel.');
    }

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fonction pour générer un PDF de la commande
  const generatePDF = async () => {
    try {
      console.log('Début de la génération du PDF...');
      
      // Récupérer les informations de l'entreprise
      let entreprise = {
        name: 'VOTRE ENTREPRISE',
        address: '123 Rue de l\'Entreprise',
        zipCode: '75000',
        city: 'Paris',
        phone: '01 23 45 67 89',
        email: 'contact@entreprise.com',
        siret: '',
        tva: '',
        logo: ''
      };
      
      try {
        const settingsResponse = await fetch('/api/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData) {
            entreprise = {
              name: settingsData.name || entreprise.name,
              address: settingsData.address || entreprise.address,
              zipCode: settingsData.zipCode || entreprise.zipCode,
              city: settingsData.city || entreprise.city,
              phone: settingsData.phone || entreprise.phone,
              email: settingsData.email || entreprise.email,
              siret: settingsData.siret || entreprise.siret,
              tva: settingsData.tva || entreprise.tva,
              logo: settingsData.logo || entreprise.logo
            };
          }
        }
      } catch (settingsError) {
        console.error('Erreur lors de la récupération des informations de l\'entreprise:', settingsError);
        // Continuer avec les valeurs par défaut
      }
      
      // Créer un nouveau document PDF avec orientation paysage pour plus d'espace
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      console.log('Document PDF créé');
      
      // Ajouter un titre
      doc.setFontSize(18);
      doc.text('BON DE COMMANDE', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      
      // Ajouter les informations de l'entreprise
      doc.setFontSize(10);
      doc.text(entreprise.name, 14, 30);
      doc.text(`Adresse: ${entreprise.address}`, 14, 35);
      doc.text(`${entreprise.zipCode} ${entreprise.city}`, 14, 40);
      doc.text(`Téléphone: ${entreprise.phone}`, 14, 45);
      doc.text(`Email: ${entreprise.email}`, 14, 50);
      if (entreprise.siret) {
        doc.text(`SIRET: ${entreprise.siret}`, 14, 55);
      }
      if (entreprise.tva) {
        doc.text(`N° TVA: ${entreprise.tva}`, 14, 60);
      }
      
      // Ajouter les informations de la commande
      doc.setFontSize(12);
      doc.text('Informations de la commande:', 14, 70);
      doc.setFontSize(10);
      doc.text(`Référence: ${commande.reference || 'Non spécifié'}`, 14, 75);
      doc.text(`Date: ${new Date(commande.dateCommande).toLocaleDateString()}`, 14, 80);
      doc.text(`Client: ${commande.clientNom || 'Non spécifié'}`, 14, 85);
      doc.text(`Taux TVA: ${commande.tauxTVA}%`, 14, 90);
      
      console.log('Informations de base ajoutées au PDF');
      
      try {
        // Ajouter les lignes de commande dans un tableau
        const tableColumn = ["#", "Article", "Description", "Type", "Unité", "Prix Unit.", "Quantité", "Total", "Option"];
        const tableRows = commande.lignes.map((ligne, index) => [
          index + 1,
          ligne.article,
          ligne.description,
          ligne.type,
          ligne.unite,
          `${ligne.prixUnitaire.toFixed(2)} €`,
          ligne.quantite,
          `${ligne.total.toFixed(2)} €`,
          ligne.estOption ? 'Oui' : 'Non'
        ]);
        
        console.log('Données du tableau préparées:', tableRows.length, 'lignes');
        
        // Ajouter le tableau au document
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 100,
          theme: 'striped',
          headStyles: { fillColor: [66, 66, 66] },
          margin: { top: 100 },
          didDrawPage: (data: any) => {
            // Ajouter un pied de page avec numéro de page
            doc.setFontSize(8);
            doc.text(
              `Page ${data.pageNumber} sur ${(doc as any).getNumberOfPages()}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10
            );
          }
        });
        
        console.log('Tableau ajouté au PDF');
      } catch (tableError) {
        console.error('Erreur lors de la création du tableau:', tableError);
        // Continuer malgré l'erreur du tableau
      }
      
      try {
        // Calculer la position Y pour le résumé (après le tableau)
        const finalY = (doc as any).lastAutoTable?.finalY + 10 || 150;
        
        // Ajouter le résumé des totaux
        doc.setFontSize(10);
        doc.text(`Sous-total: ${commande.sousTotal.toFixed(2)} €`, doc.internal.pageSize.width - 20, finalY, { align: 'right' });
        doc.text(`Total options: ${commande.totalOptions.toFixed(2)} €`, doc.internal.pageSize.width - 20, finalY + 5, { align: 'right' });
        doc.text(`TVA (${commande.tauxTVA}%): ${commande.tva.toFixed(2)} €`, doc.internal.pageSize.width - 20, finalY + 10, { align: 'right' });
        
        // Ajouter le total en gras
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: ${commande.total.toFixed(2)} €`, doc.internal.pageSize.width - 20, finalY + 20, { align: 'right' });
        
        console.log('Totaux ajoutés au PDF');
      } catch (totalsError) {
        console.error('Erreur lors de l\'ajout des totaux:', totalsError);
        // Continuer malgré l'erreur des totaux
      }
      
      // Ajouter des conditions générales
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const footerY = doc.internal.pageSize.height - 30;
      doc.text('Conditions générales:', 14, footerY);
      doc.text('1. Paiement à 30 jours après réception de la facture.', 14, footerY + 5);
      doc.text('2. Les prix sont en euros et hors taxes sauf indication contraire.', 14, footerY + 10);
      doc.text('3. Livraison selon conditions convenues.', 14, footerY + 15);
      
      // Sauvegarder le PDF avec un nom basé sur la référence ou la date
      const fileName = commande.reference 
        ? `Commande_${commande.reference}.pdf` 
        : `Commande_${params.chantierId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      console.log('PDF généré avec succès, tentative d\'ouverture...');
      
      try {
        // Méthode 1: Ouvrir dans un nouvel onglet
        window.open(URL.createObjectURL(doc.output('blob')), '_blank');
      } catch (openError) {
        console.error('Erreur lors de l\'ouverture du PDF dans un nouvel onglet:', openError);
        
        try {
          // Méthode 2: Télécharger directement
          doc.save(fileName);
          console.log('PDF téléchargé avec la méthode alternative');
        } catch (saveError) {
          console.error('Erreur lors du téléchargement direct du PDF:', saveError);
          alert('Impossible d\'ouvrir ou de télécharger le PDF. Veuillez vérifier la console pour plus de détails.');
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Détails dans la console.');
    }
  };

  // Fonction pour gérer la navigation
  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  if (status === 'loading') return <div className="p-8">Chargement...</div>

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers/${params.chantierId}/etats`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    Commande {commande.reference ? `#${commande.reference}` : ''}
                  </h1>
                  {isLocked && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border border-green-200 dark:border-green-700 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Verrouillée
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {commande.dateCommande ? new Date(commande.dateCommande).toLocaleDateString('fr-FR') : 'Date non définie'}
                  </span>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {chantier?.nomChantier || 'Chantier non défini'}
                  </span>
                  {commande.clientNom && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {commande.clientNom}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 self-end md:self-auto">
              <button
                onClick={generatePDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-green-700 hover:border-green-500 dark:border-green-600 dark:hover:border-green-500"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Télécharger PDF
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || isLocked}
                className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500 ${
                  (saving || isLocked) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* En-tête de la commande */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">Informations générales</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Référence</label>
                      <input
                        type="text"
                        value={commande.reference || ''}
                        onChange={(e) => setCommande({ ...commande, reference: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-500 disabled:dark:text-gray-400"
                        placeholder="Référence..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={commande.dateCommande ? new Date(commande.dateCommande).toISOString().substr(0, 10) : ''}
                        onChange={(e) => setCommande({ ...commande, dateCommande: new Date(e.target.value) })}
                        disabled={isLocked}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-500 disabled:dark:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">Paramètres</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Taux TVA (%) <span className="text-xs text-gray-500 dark:text-gray-400">(Déroulant)</span>
                      </label>
                      <div className="relative">
                        <select
                          value={commande.tauxTVA}
                          onChange={(e) => {
                            const newTauxTVA = parseFloat(e.target.value);
                            const newTVA = commande.sousTotal * (newTauxTVA / 100);
                            const newTotal = commande.sousTotal + newTVA;
                            setCommande({
                              ...commande,
                              tauxTVA: newTauxTVA,
                              tva: newTVA,
                              total: newTotal
                            });
                          }}
                          disabled={isLocked}
                          className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-500 disabled:dark:text-gray-400"
                        >
                          <option value="0">0%</option>
                          <option value="6">6%</option>
                          <option value="21">21%</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau des lignes de commande */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Détail de la commande
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <DndProvider backend={HTML5Backend}>
                    {/* Contenu existant pour les lignes de commande */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">#</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Article</th>
                          <th scope="col" className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Quantité</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Prix Unit.</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Total</th>
                          <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Option</th>
                          <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {commande.lignes.map((ligne, index) => (
                          <LigneCommande
                            key={index}
                            id={ligne.id}
                            index={index}
                            article={ligne.article}
                            description={ligne.description}
                            type={ligne.type}
                            unite={ligne.unite}
                            prixUnitaire={ligne.prixUnitaire}
                            quantite={ligne.quantite}
                            total={ligne.total}
                            estOption={ligne.estOption}
                            isLocked={isLocked}
                            moveLigne={!isLocked ? moveLigne : () => {}}
                            updateLigne={updateLigne}
                            deleteLigne={!isLocked ? deleteLigne : () => {}}
                          />
                        ))}
                      </tbody>
                    </table>
                  </DndProvider>
                </div>
                {!isLocked && (
                  <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button
                      onClick={addLigne}
                      className="flex items-center justify-center w-full md:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter une ligne
                    </button>
                  </div>
                )}
              </div>

              {/* Résumé de la commande */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex flex-col space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold mb-2 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">Actions</h2>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={triggerFileInput}
                          disabled={isLocked}
                          className={`flex items-center px-4 py-2 text-sm rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors ${
                            isLocked ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                          Importer Excel
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={importExcelFile}
                          accept=".xlsx,.xls"
                          className="hidden"
                        />
                        <button
                          onClick={downloadExcelTemplate}
                          className="flex items-center px-4 py-2 text-sm rounded-md shadow-sm bg-green-600 text-white hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                          Exporter Excel
                        </button>
                        {commande.id && (
                          <button
                            onClick={handleReopenCommande}
                            className={`flex items-center px-4 py-2 text-sm rounded-md shadow-sm ${
                              isLocked
                                ? 'bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600'
                                : 'bg-gray-600 text-white hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600'
                            } transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {isLocked ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              )}
                            </svg>
                            {isLocked ? 'Déverrouiller' : 'Verrouiller'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">Récapitulatif</h2>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Sous-total:</span>
                        <span className="font-medium">{commande.sousTotal.toFixed(2)} €</span>
                      </div>
                      {commande.totalOptions > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Total options:</span>
                          <span className="font-medium">{commande.totalOptions.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">TVA ({commande.tauxTVA}%):</span>
                        <span className="font-medium">{commande.tva.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Total:</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{commande.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 
