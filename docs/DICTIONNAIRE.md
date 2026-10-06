# Dictionnaire des données
Données fictives de démonstration.

| Fichier | Grain et clés | Champs |
|---|---|---|
| ventes | LigneID unique attendu ; CommandeID répété | DateVente ; ClientID ; ProduitID ; CommercialID ; Canal ; Devise ; Quantite entière positive ; PrixCatalogueHT par unité ; RemiseHT totale ; CoutUnitaireHistoriqueHT par unité ; CAFactureHT et CoutVenduHT totaux de ligne |
| retours | RetourID ; rattachement LigneID | DateRetour ; QuantiteRetournee ; RemboursementHT et CoutRecupereHT totaux |
| produits | ProduitID | Produit fictif, Categorie |
| clients | ClientID | Client fictif, Segment, Ville, DateEntreeRelation, DatePremiereCommande observée |
| commerciaux | CommercialID | Commercial fictif, Equipe |
| objectifs | Mois + CommercialID | ObjectifCAHT et ObjectifMargeBrute en EUR pour le mois complet ; cibles définies à l'avance |
| calendrier | Date | Mois YYYY-MM, Annee, Trimestre, MoisComplet (1 sur le périmètre couvert) |

Relations : ventes→produits, ventes→clients, ventes→commerciaux ; retours→ventes via LigneID. Objectifs au grain mois/commercial. La table calendrier est un référentiel à utiliser pour les rôles date de vente et date de retour.

ATTENTION : charger les fichiers bruts sans conception du modèle peut créer des clés synthétiques et des périodes mal associées. Le script Qlik sera construit à l'étape suivante, avec calendrier canonique ou dates de rôle et objectifs non dupliqués. Ne pas joindre les objectifs à chaque ligne de vente.

Les deux lignes d'une commande partagent date, client, commercial et canal dans la référence propre. La ville représente la ville du client, pas une adresse de livraison ni un magasin. Les catégories et villes sont stables dans ce lab (pas de dimension historisée).
