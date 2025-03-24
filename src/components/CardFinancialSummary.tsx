'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
)

interface CardFinancialSummaryProps {
  chantierId: string;
  etatId: string;
}

export default function CardFinancialSummary({
  chantierId,
  etatId
}: CardFinancialSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etatsAvancement, setEtatsAvancement] = useState<any[]>([]);
  const [depenses, setDepenses] = useState<any[]>([]);
  const [etatsAvancementSoustraitant, setEtatsAvancementSoustraitant] = useState<any[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [chantierInfo, setChantierInfo] = useState<{ nomChantier: string }>({ nomChantier: '' });
  const financialSummaryRef = useRef<HTMLDivElement>(null);

  // Fonction pour formater les montants en euros
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Récupérer les informations du chantier
        const chantierResponse = await fetch(`/api/chantiers/${chantierId}`);
        if (!chantierResponse.ok) {
          throw new Error('Erreur lors de la récupération des informations du chantier');
        }
        const chantierData = await chantierResponse.json();
        setChantierInfo(chantierData);
        
        // Récupérer les états d'avancement
        const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`);
        if (!etatsResponse.ok) {
          throw new Error('Erreur lors de la récupération des états d\'avancement');
        }
        const etatsData = await etatsResponse.json();
        
        // Vérifier la structure des données pour le déboggage
        console.log('Structure des états d\'avancement reçus:', etatsData);
        if (etatsData && etatsData.length > 0) {
          console.log('Exemple d\'avenants dans le premier état:', etatsData[0].avenants);
        }
        
        setEtatsAvancement(etatsData);
        
        // Récupérer les dépenses
        const depensesResponse = await fetch(`/api/chantiers/${chantierId}/depenses`);
        if (!depensesResponse.ok) {
          throw new Error('Erreur lors de la récupération des dépenses');
        }
        const depensesData = await depensesResponse.json();
        setDepenses(depensesData);
        
        // Récupérer les commandes sous-traitants validées
        const commandesResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/commandes`);
        if (!commandesResponse.ok) {
          throw new Error('Erreur lors de la récupération des commandes sous-traitants');
        }
        const commandes = await commandesResponse.json();
        
        // Filtrer pour ne garder que les commandes validées
        const commandesValidees = commandes.filter((commande: any) => commande.estVerrouillee);
        
        // Pour chaque commande validée, récupérer les états d'avancement du sous-traitant
        const etatsSSTraitantPromises = commandesValidees.map(async (commande: any) => {
          try {
            const etatsResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/${commande.soustraitantId}/etats-avancement`);
            if (!etatsResponse.ok) return [];
            
            const etats = await etatsResponse.json();
            
            if (Array.isArray(etats)) {
              return etats.map(etat => ({
                ...etat,
                soustraitantId: commande.soustraitantId,
                soustraitantNom: commande.soustraitantNom
              }));
            }
            return [];
          } catch (error) {
            console.error(`Erreur lors de la récupération des états sous-traitant:`, error);
            return [];
          }
        });
        
        const allEtatsSSTraitant = await Promise.all(etatsSSTraitantPromises);
        const flattenedEtatsSSTraitant = allEtatsSSTraitant.flat();
        setEtatsAvancementSoustraitant(flattenedEtatsSSTraitant);
        
      } catch (error) {
        console.error('Erreur lors de la récupération des données financières:', error);
        setError('Erreur lors du chargement des données financières');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [chantierId]);

  // Fonction pour générer un PDF
  const generatePDF = async () => {
    if (!financialSummaryRef.current) return;
    
    try {
      setGeneratingPDF(true);
      
      // Attendre que les graphiques soient complètement rendus
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const content = financialSummaryRef.current;
      const canvas = await html2canvas(content, {
        scale: 2, // Meilleure qualité
        useCORS: true, // Pour les images externes
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Créer un nouveau document PDF au format A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Dimensions du PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculer les dimensions pour maintenir le ratio
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      let imgWidth = pdfWidth - 20; // Marges de 10mm de chaque côté
      let imgHeight = imgWidth / ratio;
      
      // Si l'image est trop haute, ajuster la hauteur
      if (imgHeight > pdfHeight - 40) { // Marges de 20mm en haut et en bas
        imgHeight = pdfHeight - 40;
        imgWidth = imgHeight * ratio;
      }
      
      // Ajouter un titre
      pdf.setFontSize(18);
      pdf.setTextColor(44, 62, 80); // Couleur foncée pour le titre
      const title = etatId === "global" ? "Résumé Financier Global" : "Résumé Financier - État d'avancement";
      pdf.text(title, pdfWidth / 2, 20, { align: 'center' });
      
      // Ajouter le nom du chantier sous le titre
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100); // Gris pour le sous-titre
      pdf.text(chantierInfo.nomChantier, pdfWidth / 2, 28, { align: 'center' });
      
      // Ajouter l'image du résumé financier
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 35, imgWidth, imgHeight);
      
      // Ajouter un pied de page
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100); // Gris pour le pied de page
      const today = new Date().toLocaleDateString('fr-FR');
      pdf.text(`Généré le ${today} - ${chantierInfo.nomChantier}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
      
      // Télécharger le PDF
      pdf.save(`resume-financier-${chantierInfo.nomChantier.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Calcul des totaux
  const calculateFinancials = () => {
    // Calcul du total des recettes (montants des états d'avancement)
    let totalCommandeBase = 0;
    let totalAvenants = 0;

    etatsAvancement.forEach(etat => {
      // Vérifier que l'état a les propriétés nécessaires
      if (!etat.lignes) {
        console.warn('État sans propriété lignes:', etat);
        return;
      }
      
      // Pour chaque ligne, on calcule le montant actuel et on l'ajoute au total de la commande de base
      etat.lignes.forEach((ligne: any) => {
        const montantLigne = ligne.montantActuel || 0;
        totalCommandeBase += montantLigne;
        
        // Déboggage
        if (montantLigne > 0) {
          console.log(`Ligne ${ligne.id || 'sans ID'} montant: ${montantLigne}`);
        }
      });
      
      // Vérifier que l'état a des avenants
      if (etat.avenants && Array.isArray(etat.avenants)) {
        // Pour chaque avenant, on calcule le montant actuel et on l'ajoute au total des avenants
        etat.avenants.forEach((avenant: any) => {
          const montantAvenant = avenant.montantActuel || 0;
          totalAvenants += montantAvenant;
          
          // Déboggage
          if (montantAvenant > 0) {
            console.log(`Avenant ${avenant.id || 'sans ID'} montant: ${montantAvenant}`);
          }
        });
      }
    });

    // Log pour vérifier les calculs
    console.log('Total commande base calculé détaillé:', totalCommandeBase);
    console.log('Total avenants calculé détaillé:', totalAvenants);
    
    const totalRevenue = totalCommandeBase + totalAvenants;

    // Calcul du total des dépenses enregistrées manuellement
    const manualExpenses = depenses.reduce((total, depense) => {
      return total + (depense.montant || 0);
    }, 0);
    
    // Calcul du total des états sous-traitants
    const soustraitantExpenses = etatsAvancementSoustraitant.reduce((total, etat) => {
      // Somme des montants actuels des lignes
      const montantLignes = etat.lignes?.reduce((sum: number, ligne: any) => sum + (ligne.montantActuel || 0), 0) || 0;
      // Somme des montants actuels des avenants
      const montantAvenants = etat.avenants?.reduce((sum: number, avenant: any) => sum + (avenant.montantActuel || 0), 0) || 0;
      
      return total + montantLignes + montantAvenants;
    }, 0);
    
    // Total de toutes les dépenses (manuelles + sous-traitants)
    const totalExpenses = manualExpenses + soustraitantExpenses;

    // Calcul du résultat net
    const netResult = totalRevenue - totalExpenses;
    
    // Calcul de la marge (en pourcentage)
    const margin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      manualExpenses,
      soustraitantExpenses,
      netResult,
      margin,
      totalCommandeBase,
      totalAvenants
    };
  };

  // Titre différent selon si on est sur un état spécifique ou sur la vue globale
  const title = etatId === "global" 
    ? "Résumé Financier Global" 
    : "Résumé Financier";
  
  const description = etatId === "global"
    ? "Vue d'ensemble des finances du chantier"
    : "Vue d'ensemble des finances de cet état d'avancement";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">Chargement des données financières...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const financialData = calculateFinancials();
  const depensesByCategory = calculateDepensesByCategory(financialData);
  
  // Données pour le graphique en camembert des dépenses
  const depensesChartData = {
    labels: depensesByCategory.map(cat => cat.name),
    datasets: [
      {
        data: depensesByCategory.map(cat => cat.amount),
        backgroundColor: [
          '#3B82F6', // blue-500
          '#EF4444', // red-500
          '#10B981', // green-500
          '#F59E0B', // amber-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#6366F1', // indigo-500
          '#14B8A6', // teal-500
          '#F97316', // orange-500
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Données pour le graphique en barres de la répartition commande/avenants
  const commandeAvenantsChartData = {
    labels: ['Commande de base', 'Avenants'],
    datasets: [
      {
        label: 'Montant (€)',
        data: [financialData.totalCommandeBase, financialData.totalAvenants],
        backgroundColor: ['#3B82F6', '#8B5CF6'],
      },
    ],
  };
  
  // Données pour le graphique en barres de la répartition des dépenses
  const depensesTypeChartData = {
    labels: ['Dépenses manuelles', 'États sous-traitants'],
    datasets: [
      {
        label: 'Montant (€)',
        data: [financialData.manualExpenses, financialData.soustraitantExpenses],
        backgroundColor: ['#EF4444', '#F97316'],
      },
    ],
  };
  
  // Options pour le graphique en barres
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.raw);
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <button
          onClick={generatePDF}
          disabled={generatingPDF}
          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          {generatingPDF ? 'Génération...' : 'Télécharger PDF'}
        </button>
      </CardHeader>
      <CardContent ref={financialSummaryRef}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-2">Recettes</h3>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(financialData.totalRevenue)}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <BanknotesIcon className="h-6 w-6 text-blue-700" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">Total des états d'avancement</p>
          </div>
          
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2">Dépenses</h3>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(financialData.totalExpenses)}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-700" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">
              Dépenses manuelles: {formatCurrency(financialData.manualExpenses)} <br/>
              États sous-traitants: {formatCurrency(financialData.soustraitantExpenses)}
            </p>
          </div>
          
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2">Résultat Net</h3>
                <p className={`text-2xl font-bold ${financialData.netResult >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatCurrency(financialData.netResult)}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-700" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">Recettes - Dépenses</p>
          </div>
          
          <div className="border rounded-lg p-4 bg-purple-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-purple-700 mb-2">Marge</h3>
                <p className={`text-2xl font-bold ${financialData.margin >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                  {financialData.margin.toFixed(2)}%
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <ReceiptPercentIcon className="h-6 w-6 text-purple-700" />
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">Pourcentage du résultat net sur les recettes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Répartition commande de base / avenants */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Répartition Commande / Avenants</h3>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Commande de base:</span>
                <span className="font-bold">{formatCurrency(financialData.totalCommandeBase)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Avenants:</span>
                <span className="font-bold">{formatCurrency(financialData.totalAvenants)}</span>
              </div>
              <div className="h-60">
                <Bar data={commandeAvenantsChartData} options={barChartOptions} />
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                {financialData.totalAvenants > 0 
                  ? `Les avenants représentent ${((financialData.totalAvenants / financialData.totalRevenue) * 100).toFixed(1)}% du montant total`
                  : 'Aucun avenant enregistré'}
              </div>
            </div>
          </div>

          {/* Répartition des dépenses par type */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Répartition des dépenses</h3>
            {financialData.totalExpenses > 0 ? (
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Dépenses manuelles:</span>
                  <span className="font-bold">{formatCurrency(financialData.manualExpenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">États sous-traitants:</span>
                  <span className="font-bold">{formatCurrency(financialData.soustraitantExpenses)}</span>
                </div>
                <div className="h-60">
                  <Bar data={depensesTypeChartData} options={barChartOptions} />
                </div>
                <div className="text-xs text-gray-500 text-center mt-2">
                  {financialData.soustraitantExpenses > 0 
                    ? `Les états sous-traitants représentent ${((financialData.soustraitantExpenses / financialData.totalExpenses) * 100).toFixed(1)}% des dépenses totales`
                    : 'Aucun état sous-traitant enregistré'}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-60">
                <p className="text-gray-500">Aucune dépense enregistrée</p>
              </div>
            )}
          </div>

          {/* Répartition des dépenses par catégorie */}
          <div className="border rounded-lg p-4 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Répartition des dépenses par catégorie</h3>
            {depensesByCategory.length > 0 ? (
              <div className="flex flex-col h-full">
                <div className="h-60">
                  <Doughnut 
                    data={depensesChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.raw as number;
                              const percentage = ((value / financialData.totalExpenses) * 100).toFixed(1);
                              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
                <div className="mt-4 text-center text-sm text-gray-500">
                  {depensesByCategory.length} catégorie(s) de dépenses
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-60">
                <p className="text-gray-500">Aucune dépense enregistrée</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Données calculées à partir de {etatsAvancement.length} état(s) d'avancement, {etatsAvancementSoustraitant.length} état(s) sous-traitant et {depenses.length} dépense(s)
        </p>
        <p className="text-sm text-muted-foreground">
          Chantier: {chantierInfo.nomChantier}
        </p>
      </CardFooter>
    </Card>
  );

  // Fonction pour calculer les dépenses par catégorie
  function calculateDepensesByCategory(financialData: any) {
    const categories: Record<string, number> = {};
    
    // Ajouter les dépenses manuelles par catégorie
    depenses.forEach(depense => {
      const categorie = depense.categorie || 'Autre';
      if (!categories[categorie]) {
        categories[categorie] = 0;
      }
      categories[categorie] += depense.montant || 0;
    });
    
    // Ajouter les états sous-traitants comme une catégorie distincte
    if (financialData.soustraitantExpenses > 0) {
      categories["États sous-traitants"] = financialData.soustraitantExpenses;
    }
    
    // Convertir en tableau et trier par montant décroissant
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
}
