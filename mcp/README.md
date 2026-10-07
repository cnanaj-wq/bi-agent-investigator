# Pont MCP Qlik du lab — prototype 0.1

Ce programme permet a un client MCP de demander des chiffres a Qlik Sense Desktop.
Qlik effectue les calculs ; le programme transporte les demandes et journalise les reponses.
Il ne lance pas encore Claude/GPT ou Conductor. Il est independant de l'ancien serveur Qlik.

## Premiere connexion sur Windows

Prealable : Node.js >=22 et application BI_Agent_Investigator chargee dans Qlik Desktop.
Depuis PowerShell, apres `git pull --ff-only` dans le depot :

```powershell
powershell -ExecutionPolicy Bypass -File "C:\bi-agent-investigator\mcp\configurer.ps1"
```

Le script repere le QVF dans le dossier Documents Windows (y compris sa redirection OneDrive),
ecrit `config.local.json`, installe les dependances verrouillees et execute un audit.
Si necessaire, fournir `-AppPath "C:\chemin\BI_Agent_Investigator.qvf"`.
La configuration et `logs/` sont ignores par Git. Aucun fichier QVF n'est publie.
Pour refaire le controle : `node C:\bi-agent-investigator\mcp\check.mjs`.

Pour le futur client MCP : commande `node`, argument absolu
`C:\bi-agent-investigator\mcp\server.mjs`. La configuration est resolue par rapport
au programme, independamment du repertoire courant. Pas d'URL HTTP MCP.
Le serveur stdio attend normalement en silence ; stderr annonce son demarrage.

## Trois outils

- `bi_catalogue` : definitions et limites, aucun chiffre de reference.
- `bi_audit` : audit global de chargement, premiere/derniere vente, devise.
- `bi_query` : periode explicite (debut/fin YYYY-MM inclusifs), 1 a 8 mesures,
  un axe facultatif. Exemple :

```json
{"debut":"2025-10","fin":"2026-09","dimension":"MoisAnalyse","mesures":["ca_net","marge","flux_cout_inconnu"]}
```

Les chiffres de l'ancien scenario ne sont pas des reponses attendues pour ce jeu.
Le catalogue ne contient ni les anomalies injectees ni les valeurs de reference.
Le client LLM ne doit pas recevoir le generateur ou le dossier du corrige.

## Lecture et traces

Les seules methodes QIX autorisees dans cet adaptateur sont OpenDoc, GetTablesAndKeys,
CreateSessionObject, GetLayout, DestroySessionObject. Les objets de session sont temporaires.
Pas de sauvegarde, de modification d'objet persistant, de rechargement ni de selection.
Chaque appel ouvre une connexion puis la ferme, y compris en cas d'erreur.
Les agregations utilisent `{1<...>}` pour ignorer les selections de l'utilisateur.
La restriction concerne cet adaptateur ; elle ne remplace pas les droits du moteur Qlik.

Chaque appel Qlik possede un UUID `trace_id` et un fichier `logs/<UUID>.json` :
parametres, requetes exactes, expressions, resultat et dates UTC. Le chemin QVF est masque.
Le resultat contient valeur numerique, texte Qlik et indicateur de NULL. Aucune conversion
locale des textes numeriques. Les calculs restent dans Qlik.
Les traces sont locales, non signees : ce sont des elements de diagnostic, pas un registre inviolable.
Le rapport devra citer cet UUID ; le lien cliquable dans Conductor reste a construire.

## Limites connues

La marge totale est NULL si un cout manque, ou s'il n'y a aucun flux.
Le taux est une fraction (0,25 = 25 %) et devient NULL si le CA net est nul.
Les objectifs ne sont disponibles que globalement, par mois ou par commercial.
Les periodes sont des mois calendaires entiers, au maximum 36 par requete.
Le client doit verifier la couverture reelle des ventes avant toute comparaison annuelle.
Les mois du calendrier ne garantissent pas des ventes completes. L'audit est global au rechargement.
Les dimensions peuvent montrer des membres sans activite ; la marge reste NULL sans flux.

Prototype limite a un axe et sans filtres additionnels. Maximum 1000 lignes et 10000 cellules
par resultat ; `truncated` signale un resultat partiel. Pas de calcul automatique de contributions,
de comparaison annuelle ni de reconciliation a ce stade. Aucun chiffre ne doit etre invente pour combler ces limites.
Le modele attendu est celui des scripts Qlik 01 a 04. Le scenario sans couts requiert un autre contrat
et est refuse comme modele incomplet par cette version.

## Validation

`npm test` controle les garde-fous, les erreurs et le protocole sur des doubles de test.
Ces tests ne valident pas les calculs du moteur Qlik.
Le test `npm run check` doit etre execute sur le PC Windows disposant de Qlik.
Les KPI, l'absence d'effet des selections et la destruction des objets de session restent
ensuite a comparer dans Qlik avant de brancher le LLM et Conductor.

References : [SDK MCP stdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md),
[Qlik HyperCubeDef](https://qlikapi-ts.qlik.dev/types/qix.HyperCubeDef.html).
