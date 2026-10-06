# BI Agent Lab — étape 1 : données et règles métier

**Données fictives de démonstration. Prototype pédagogique, pas une solution de production.**

## Contexte et objectif
Un responsable commercial demande : « Analyse le CA et la marge des 12 derniers mois complets. Repère les anomalies, décompose les écarts et justifie chaque constat. »
Qlik calculera les chiffres, Claude/GPT choisira les investigations, des workers Python exécuteront les outils MCP autorisés et Conductor orchestrera les étapes. L'humain décidera des actions proposées ; aucune action commerciale ne sera exécutée dans ce lab.

## État réel
Créé : générateur reproductible Python sans dépendance, CSV, scénarios qualité, contrôles et documentation.
Non réalisé dans ce nouveau projet : chargement Qlik, workers, MCP, Conductor, modèles, validation humaine et comparaison Claude/GPT. Les résultats de l'ancien Ventes_conso ne sont pas des validations de ce lab.

## Les données
Période : 2023-10-01 à 2026-09-30. Devise unique EUR, HT. 15 000 lignes de référence, 7 500 commandes (2 lignes chacune), 500 clients, 40 produits, 8 commerciaux, 6 villes, 3 canaux, 371 retours, 288 objectifs mensuels.
Les données ne représentent aucune entreprise réelle. La régularité du nombre de commandes et les anomalies accentuées facilitent l'apprentissage : ce n'est pas un échantillon représentatif du marché.

## Dossiers
- `01_donnees_exercice/` : 7 CSV à utiliser pour la première enquête ; ventes contient 15 001 lignes avec anomalies qualité volontaires.
- `02_test_sans_couts/` : variante indépendante ; ne JAMAIS charger avec le premier jeu. Tous les coûts sont retirés, y compris dans les retours. Objectifs de marge = cibles, pas coûts observés.
- `90_corrige_prive/` : référence propre, contrôles Python, anomalies et corrigé. Réservé à l'évaluateur, ne pas exposer à l'agent.
- `docs/` : KPI, dictionnaire, protocole pédagogique.
- `generer.py` : reconstruction identique (seed 20261006).
- `manifest_sha256.json` : empreintes des CSV.

Le nom « prive » d'un dossier n'est PAS un contrôle d'accès. Un agent capable de lire tout le dépôt pourra lire le corrigé et le générateur. Son accès futur sera limité aux outils Qlik et aux données d'exercice. Ce dépôt est public. Le corrigé et le générateur sont consultables par tous ; limiter techniquement les accès de l’agent pendant le benchmark.

## Format et utilisation
CSV UTF-8 avec BOM ; séparateur point-virgule ; décimale point ; dates ISO YYYY-MM-DD ; valeurs absentes = cellules vides. Importer explicitement ce format dans Qlik/Excel.
Aucune installation nécessaire pour lire les CSV. Pour régénérer, dans UNE COPIE du dossier, exécuter `python generer.py` (Windows : `py generer.py`). Cela remplace les données générées.

## Première étape pédagogique
Ouvrir `01_donnees_exercice/ventes.csv`. Une ligne décrit un produit dans une commande. Une commande comporte plusieurs lignes : le panier est calculé par commande et non par ligne. Lire `docs/KPI.md` avant de créer le modèle Qlik.

## Git
Versionner code, docs et petits CSV fictifs. Ne jamais versionner clés API, `.env`, applications Qlik contenant des données réelles, logs d'exécution ou bases Conductor. Le `.gitignore` fournit une première exclusion, il ne remplace pas une revue des fichiers avant commit.

## Prochaines étapes
1. Valider les définitions métier avec Cédric.
2. Modéliser dans Qlik, dédupliquer les lignes exactes sans effacer l'alerte et contrôler les KPI.
3. Exposer un outil en lecture seule et une preuve par résultat.
4. Connecter un modèle, puis une boucle bornée.
5. Validation humaine et tests de reprise avec idempotence des workers.
6. Comparaison 5 + 5 exécutions ; aucune conclusion générale sur les modèles.
