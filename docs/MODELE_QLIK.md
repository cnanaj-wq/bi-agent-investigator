# Modèle Qlik — ventes, retours et objectifs

Données fictives de démonstration. Étapes ventes/dimensions/retours rechargées avec succès par l'utilisateur le 06/10/2026. La consolidation et le calendrier de cette étape restent à valider dans Qlik.

## Pourquoi une table commune ?

FAITS_COMMERCIAUX contient 15 000 lignes VENTE, 371 lignes RETOUR et 288 lignes OBJECTIF, soit **15 659 flux**. FluxID est la clé unique ; LigneID rattache un retour à sa vente d'origine et n'est plus unique dans cette table. Les données de VENTES et RETOURS sont reprises avant suppression de ces tables de travail. Les audits précédents restent disponibles.

Les dimensions PRODUITS, CLIENTS et COMMERCIAUX partagent respectivement une seule clé avec les faits. CALENDRIER partage uniquement DateAnalyse. Les tables AUDIT sont déconnectées. Aucun montant de vente n'est dupliqué pour ajouter un objectif ou un retour.

## Dates : ne pas confondre flux et cohorte

- DateAnalyse : jour de vente pour VENTE, jour de remboursement pour RETOUR.
- MoisAnalyse, AnneeAnalyse et TrimestreAnalyse filtrent ces événements.
- DateVente est aussi conservée sur les retours, comme date de leur vente d'origine. La sélectionner analyse une cohorte, pas les flux d'un mois.
- DateRetour reste disponible pour la traçabilité. La sélectionner exclut les ventes sans retour : ne pas l'utiliser pour le CA net mensuel.
- Calendrier complet : 1 096 jours, du 01/10/2023 au 30/09/2026, 36 mois.
- Fenêtre de référence : octobre 2025–septembre 2026 ; comparaison octobre 2024–septembre 2025.

## Objectifs : limites explicites

L'objectif mensuel de chaque commercial est placé au premier jour du mois. Utiliser des mois complets pour toute comparaison aux objectifs ; aucun prorata journalier n'est défini. Pas d'objectif par produit, catégorie, client, ville, segment ou canal : une sélection sur ces axes exclut les lignes OBJECTIF, et l'atteinte doit être affichée comme non disponible, jamais zéro ou un objectif imputé arbitrairement.

Les 790 lignes sans commercial n'ont pas d'objectif propre. L'atteinte globale tous commerciaux représente le CA total par rapport au plan des huit commerciaux ; l'atteinte par commercial exclut naturellement ces ventes non attribuables. Documenter ce périmètre dans la restitution.

## Expressions de base proposées (à valider dans Qlik)

Utiliser les dimensions de CALENDRIER pour les périodes. Les expressions ci-dessous fixent TypeFlux pour éviter de compter les objectifs comme des ventes.

| KPI | Expression |
|---|---|
| CA facturé HT | Sum({<TypeFlux={'VENTE'}>} CAFactureHT) |
| Remboursements HT | Sum({<TypeFlux={'RETOUR'}>} RemboursementHT) |
| CA net HT | Sum({<TypeFlux={'VENTE','RETOUR'}>} CAFluxHT) |
| Commandes de vente | Count({<TypeFlux={'VENTE'}>} DISTINCT CommandeID) |
| Unités vendues | Sum({<TypeFlux={'VENTE'}>} Quantite) |
| Clients acheteurs | Count({<TypeFlux={'VENTE'}>} DISTINCT ClientID) |
| Marge brute, seulement si coûts connus | If(Sum({<TypeFlux={'VENTE','RETOUR'}>} FlagCoutFluxInconnu)=0, Sum({<TypeFlux={'VENTE','RETOUR'}>} CAFluxHT)-Sum({<TypeFlux={'VENTE','RETOUR'}>} CoutFluxHT), Null()) |
| Lignes de vente sans coût | Sum({<TypeFlux={'VENTE'}>} FlagCoutManquant) |
| Objectif CA, mois entiers et axes compatibles | Sum({<TypeFlux={'OBJECTIF'}>} ObjectifCAHT) |

Pour le taux de marge, le panier et les taux d'atteinte, protéger les dénominateurs nuls et afficher « non disponible » si le périmètre est incomplet ou incompatible. Ne pas créer un taux d'atteinte par produit avec un objectif global. Les expressions complètes et garde-fous seront intégrés aux outils avant l'accès du LLM.

La marge totale du jeu d'exercice reste NON CALCULABLE sur un périmètre contenant un coût inconnu. La version propre ne doit pas servir à combler en secret ces valeurs. Le taux de couverture et la marge partielle doivent être explicitement nommés.

## Rechargement

Le point d'entrée reste :

~~~qlik
$(Must_Include=lib://BI_AGENT_SCRIPTS/01_chargement_ventes.qvs);
~~~

Il appelle automatiquement les étapes 02, 03 puis 04. Ne pas ajouter leurs inclusions séparément.

Attendus : 15 659 flux distincts, 288 objectifs, 1 096 jours, 0 date hors calendrier, 72 flux avec coût inconnu, 0 clé synthétique. Le nombre 15 659 n'est PAS un nombre de ventes.
