# Définitions KPI v1
Données fictives de démonstration. Les calculs de contrôle Python vérifient la génération ; lors de l'enquête, les chiffres doivent provenir de Qlik et porter une preuve. La validation Qlik reste à réaliser.

| KPI | Règle |
|---|---|
| CA avant remises | Somme Quantite × PrixCatalogueHT à la date de vente |
| Remises | Somme RemiseHT, montant total de la ligne (pas un prix unitaire) |
| CA facturé | CA avant remises − remises ; champ CAFactureHT disponible pour rapprochement |
| Remboursements | Somme RemboursementHT à la date de retour |
| CA net | CA facturé de la période − remboursements de la période |
| Coût net | Coût historique vendu à la date de vente − coût récupéré à la date de retour |
| Marge brute EUR | CA net − coût net |
| Marge sur CA % | Marge brute / CA net ; ce ratio est souvent appelé taux de marque, libellé explicite retenu |
| Taux de remise | Remises / CA avant remises |
| Commandes | Count DISTINCT CommandeID, à la date de vente |
| Panier moyen facturé | CA facturé / commandes, avant retours |
| Prix moyen réalisé par unité | CA facturé / unités vendues, avant retours ; ne pas appeler ce ratio « panier » |
| Clients actifs | Clients distincts ayant acheté pendant la période, même si achat ensuite retourné |
| Nouveaux clients | Première commande observée dans la période ; historique antérieur inconnu |
| Taux de retour par cohorte | Unités retournées des ventes de la cohorte / unités vendues dans cette cohorte, à date d'arrêté |
| Objectifs | Sommes à la granularité mois × commercial, sans multiplication par les lignes de vente |
| Atteinte | Réalisé / objectif sur périmètres et dates comparables |
| Variation | Actuel − précédent ; pourcentage = écart / précédent si précédent strictement positif ; sinon signaler non pertinent |

Derniers 12 mois complets : octobre 2025 à septembre 2026 ; comparaison : octobre 2024 à septembre 2025. Arrêté des données : 30 septembre 2026 ; ne pas utiliser le dernier jour de vente seul pour conclure à la complétude. Chargement réel et date de génération sont des métadonnées distinctes.

## Coûts absents et doublons
Un coût absent n'est jamais zéro. Publier la couverture en lignes ET en CA facturé, et la marge seulement sur le périmètre à coût connu. La marge totale doit être marquée NON CALCULABLE si elle dépend d'un coût manquant. Les retours conservent le coût connu de l'article retourné : cela ne permet pas de reconstituer arbitrairement les coûts absents des autres lignes.
Détecter les doublons de LigneID. Le doublon injecté est strictement identique ; le dédupliquer avec journal et compteur. Une collision de clé avec valeurs divergentes exigerait une règle différente.

## Retours
Un retour par ligne maximum, une unité, remboursement unitaire net de remise, totalité du coût unitaire récupérée (article revendable). Pas de frais logistiques, TVA, charges de structure ou amortissements : marge brute, pas bénéfice net. Les retours après le 30/09/2026 sont hors arrêté ; les cohortes récentes ont un recul plus court.

## Contributions
Pour un axe donné, somme des contributions à l'écart = écart total, y compris le membre « non renseigné ». Les contributions par produit, ville et commercial sont des vues alternatives : ne pas les additionner entre axes. Réconcilier avant arrondi, tolérance affichée 0,01 EUR.
Décomposition préconisée du CA facturé : effet quantité = (Q1−Q0)×P0 ; effet prix/mix = Q1×(P1−P0), où P = CA facturé/Q. Identité exacte si Q0,Q1 > 0. Les retours se décomposent séparément. Un effet prix/mix n'est pas une preuve de hausse/baisse des tarifs ni une décomposition causale.

## Qualité et saisonnalité
Une absence de vente un jour n'est pas une preuve de données manquantes. Une baisse de décembre à janvier peut être saisonnière : comparer à l'année précédente. La règle de détection et son classement seront figés avant le benchmark, à partir des KPI validés Qlik. Ne pas coder « avril » comme réponse dans le prompt.
