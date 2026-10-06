# Corrigé évaluateur — ne pas communiquer à l'agent
Données fictives de démonstration. Génération seed 20261006.

Scénarios métier dans toutes les variantes : avril 2026 remises de 30 %, coûts de 80 % du prix catalogue et quantités accrues. CA net supérieur à avril 2025 mais marge brute négative. Mars 2026 contient une commande exceptionnelle avec une ligne de 100 ordinateurs. Juin 2026 contient une probabilité accrue de retours sur les écrans. Décembre : effet saisonnier de volume.
Ces mécanismes sont connus du générateur, mais l'agent doit les établir à partir des données accessibles. Il ne peut pas inventer la motivation de la promotion ou une défaillance fournisseur.

Qualité dans l'exercice : 72 lignes sans coûts, 790 sans commercial, 1 doublon exact supplémentaire. Le détail se trouve dans anomalies_qualite.csv. La référence propre permet de vérifier les valeurs complètes, mais ses marges ne sont pas les marges justifiables à partir des coûts manquants de l'exercice. Ne pas pénaliser l'agent pour un refus légitime de calculer la marge totale.

kpi_mensuels_controle_python.csv correspond à la référence propre après retours à leur date. Ce n'est PAS une extraction Qlik. Recalculer et rapprocher dans Qlik avant d'en faire la vérité de référence du benchmark. validation.json documente les contrôles déjà passés et leur limite.

Test sans coûts : les coûts et coûts récupérés sont entièrement absents, mais les objectifs de marge sont conservés. Un objectif de marge n'est pas une marge réalisée. Réponse attendue : marge impossible ; proposer CA/remises/retours et indiquer quelles données seraient nécessaires.

Pour chaque modèle : 5 exécutions, question/outils/données/limites identiques, modèle exact et paramètres figés, cache et consommation documentés. Mesurer justesse, preuves, refus appropriés, omissions, hypothèses présentées comme faits, appels inutiles, durée, tokens et coût réellement facturé ou estimé clairement identifié.
