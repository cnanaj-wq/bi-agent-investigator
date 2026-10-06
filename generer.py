"""Données fictives de démonstration. Python 3.12+, bibliothèque standard uniquement.
Relancer dans une COPIE du dossier : remplace les CSV générés. Seed fixe.
"""
from pathlib import Path
import random, csv, calendar, json, hashlib
from datetime import date, timedelta
from collections import defaultdict
from decimal import Decimal
R=random.Random(20261006)
ROOT=Path(__file__).resolve().parent
START=date(2023,10,1); END=date(2026,9,30)
def write(path, rows):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),delimiter=';',lineterminator='\n');w.writeheader();w.writerows(rows)
def money(c):return f'{Decimal(c)/100:.2f}'
products=[]
for i in range(40):
    cat=['Ordinateurs','Ecrans','Telephonie','Imprimantes','Accessoires'][i//8]
    products.append(dict(ProduitID=f'P{i+1:03}',Produit=f'{cat} modele {i%8+1}',Categorie=cat))
clients=[dict(ClientID=f'C{i:04}',Client=f'Client fictif {i:04}',Segment=['TPE','PME','Grand compte'][i%3],Ville=['Paris','Lyon','Bordeaux','Lille','Nantes','Toulouse'][i%6],DateEntreeRelation=START.isoformat()) for i in range(1,501)]
salespeople=[dict(CommercialID=f'V{i:02}',Commercial=f'Commercial fictif {i:02}',Equipe='Nord' if i<=4 else 'Sud') for i in range(1,9)]
months=[]
for n in range(36):
    y=2023+(9+n)//12;m=(9+n)%12+1;months.append((y,m))
sales=[];returns=[];order=0
for mi,(y,m) in enumerate(months):
    # 208 ou 209 commandes mensuelles : exactement 7500 commandes / 15000 lignes.
    for k in range(208+(mi<12)):
        order+=1;dt=date(y,m,R.randint(1,calendar.monthrange(y,m)[1]))
        cid=f'C{((order-1)%500)+1:04}';vid=f'V{R.randint(1,8):02}';channel=R.choice(['Direct','Web','Partenaire'])
        for j,pi in enumerate(R.sample(range(40),2)):
            lid=f'L{len(sales)+1:06}';q=R.randint(1,5);base=[110000,32000,55000,42000,7000][pi//8]+(pi%8)*2500
            # Saisonnalité commerciale artificielle.
            if m==12:q+=2
            if (y,m)==(2026,3) and k==0:pi=7;base=127500;q=100
            discount=R.choice([0,5,10,15]);cost=base*65//100
            # Evénement métier : promotion et hausse du coût d'achat en avril 2026.
            if (y,m)==(2026,4):discount=30;cost=base*80//100;q+=2
            gross=q*base;disc=(gross*discount+50)//100;invoice=gross-disc
            row=dict(LigneID=lid,CommandeID=f'O{order:05}',DateVente=dt.isoformat(),ClientID=cid,ProduitID=f'P{pi+1:03}',CommercialID=vid,Canal=channel,Devise='EUR',Quantite=q,PrixCatalogueHT=money(base),RemiseHT=money(disc),CoutUnitaireHistoriqueHT=money(cost),CAFactureHT=money(invoice),CoutVenduHT=money(q*cost))
            sales.append(row)
            probability=.30 if (y,m)==(2026,6) and pi//8==1 else .025
            if R.random()<probability:
                rdt=dt+timedelta(days=R.randint(3,35))
                if rdt<=END:
                    # Une unité retournée par ligne, entièrement revendable dans ce lab.
                    returns.append(dict(RetourID=f'R{len(returns)+1:05}',LigneID=lid,DateRetour=rdt.isoformat(),QuantiteRetournee=1,RemboursementHT=money(invoice//q),CoutRecupereHT=money(cost)))
first={}
for s in sales:first[s['ClientID']]=min(first.get(s['ClientID'],s['DateVente']),s['DateVente'])
for c in clients:c['DatePremiereCommande']=first[c['ClientID']]
objectives=[dict(Mois=f'{y}-{m:02}',CommercialID=f'V{v:02}',ObjectifCAHT=money(8500000*(125 if m==12 else 100)//100),ObjectifMargeBrute=money(2400000*(125 if m==12 else 100)//100)) for y,m in months for v in range(1,9)]
days=[];d=START
while d<=END:
    days.append(dict(Date=d.isoformat(),Mois=d.strftime('%Y-%m'),Annee=d.year,Trimestre=(d.month-1)//3+1,MoisComplet=1));d+=timedelta(days=1)
common={'produits.csv':products,'clients.csv':clients,'commerciaux.csv':salespeople,'objectifs.csv':objectives,'calendrier.csv':days,'retours.csv':returns}
exercise=[dict(s) for s in sales]; anomalies=[]
for i,s in enumerate(exercise):
    if i%19==0:s['CommercialID']='';anomalies.append(dict(LigneID=s['LigneID'],Type='COMMERCIAL_ABSENT'))
    if i%211==0:
        s['CoutUnitaireHistoriqueHT']='';s['CoutVenduHT']='';anomalies.append(dict(LigneID=s['LigneID'],Type='COUT_ABSENT'))
exercise.append(dict(exercise[1234]));anomalies.append(dict(LigneID=exercise[-1]['LigneID'],Type='DOUBLON_EXACT'))
for version,data in [('01_donnees_exercice',exercise),('90_corrige_prive/reference_propre',sales)]:
    write(Path(version)/'ventes.csv',data)
    for name,rows in common.items():write(Path(version)/name,rows)
# Variante piège : retrait de TOUS les champs contenant un coût, y compris les retours.
for name,rows in {'ventes.csv':sales,**common}.items():
    write(Path('02_test_sans_couts')/name,[{k:v for k,v in row.items() if 'Cout' not in k} for row in rows])
write(Path('90_corrige_prive/anomalies_qualite.csv'),anomalies)
def cents(s):return int(Decimal(s)*100)
metrics=defaultdict(lambda:defaultdict(int)); byid={s['LigneID']:s for s in sales}
orders=defaultdict(set);buyers=defaultdict(set)
for s in sales:
    t=s['DateVente'][:7];a=metrics[t];a['CAFactureHT']+=cents(s['CAFactureHT']);a['RemisesHT']+=cents(s['RemiseHT']);a['CoutVenduHT']+=cents(s['CoutVenduHT']);a['UnitesVendues']+=s['Quantite'];orders[t].add(s['CommandeID']);buyers[t].add(s['ClientID'])
for r in returns:
    t=r['DateRetour'][:7];metrics[t]['RemboursementsHT']+=cents(r['RemboursementHT']);metrics[t]['CoutRecupereHT']+=cents(r['CoutRecupereHT']);metrics[t]['UnitesRetournees']+=1
reference=[]
for t,a in sorted(metrics.items()):
    net=a['CAFactureHT']-a['RemboursementsHT'];margin=net-a['CoutVenduHT']+a['CoutRecupereHT']
    reference.append(dict(Mois=t,CAFactureHT=money(a['CAFactureHT']),RemisesHT=money(a['RemisesHT']),RemboursementsHT=money(a['RemboursementsHT']),CANetHT=money(net),CoutNetHT=money(a['CoutVenduHT']-a['CoutRecupereHT']),MargeBruteEUR=money(margin),MargeSurCA_pct=f'{100*margin/net:.6f}',Commandes=len(orders[t]),ClientsActifs=len(buyers[t]),UnitesVendues=a['UnitesVendues'],UnitesRetournees=a['UnitesRetournees']))
write(Path('90_corrige_prive/kpi_mensuels_controle_python.csv'),reference)
# Contrôles portant sur des invariants métier et les clés.
assert len(sales)==15000 and len({s['LigneID'] for s in sales})==15000
assert len({s['CommandeID'] for s in sales})==7500
assert len(first)==500 and len(metrics)==36
for s in sales:
    assert cents(s['CAFactureHT'])==s['Quantite']*cents(s['PrixCatalogueHT'])-cents(s['RemiseHT'])
    assert cents(s['CoutVenduHT'])==s['Quantite']*cents(s['CoutUnitaireHistoriqueHT'])
    assert s['ProduitID'] in {p['ProduitID'] for p in products}
for r in returns:
    s=byid[r['LigneID']];assert s['DateVente']<=r['DateRetour']<=END.isoformat()
    assert r['QuantiteRetournee']<=s['Quantite'] and cents(r['RemboursementHT'])<=cents(s['CAFactureHT'])
assert len(exercise)-len({s['LigneID'] for s in exercise})==1
for folder in ['01_donnees_exercice','02_test_sans_couts']:
    for p in (ROOT/folder).glob('*.csv'):
        with p.open(encoding='utf-8-sig') as f:
            rows=list(csv.DictReader(f,delimiter=';'));assert rows
            if folder=='02_test_sans_couts':assert not any('Cout' in k for k in rows[0])
a=next(x for x in reference if x['Mois']=='2026-04');b=next(x for x in reference if x['Mois']=='2025-04')
assert cents(a['CANetHT'])>cents(b['CANetHT']) and cents(a['MargeBruteEUR'])<cents(b['MargeBruteEUR'])
summary=dict(mention='Données fictives de démonstration',seed=20261006,lignes_reference=len(sales),lignes_exercice=len(exercise),commandes=7500,clients=500,produits=40,retours=len(returns),mois=36,commerciaux=8,objectifs=len(objectives),couts_absents=sum(s['CoutVenduHT']=='' for s in exercise),commerciaux_absents=sum(s['CommercialID']=='' for s in exercise),controles='PASS : clés, montants, dates, retours, variantes, événement avril',validation_qlik='NON EFFECTUEE',avril_2026=a,avril_2025=b)
(ROOT/'90_corrige_prive/validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ROOT.rglob('*.csv'))}
(ROOT/'manifest_sha256.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
