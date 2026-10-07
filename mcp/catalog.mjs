import * as z from 'zod/v4';

export const DIMENSIONS = ['MoisAnalyse', 'Categorie', 'Produit', 'Ville', 'Segment', 'Commercial', 'Canal'];
export const METRICS = {
  ca_facture: 'CA facture HT, ventes uniquement',
  remboursements: 'Remboursements HT a la date du retour',
  ca_net: 'CA facture moins remboursements, EUR HT',
  commandes: 'Commandes distinctes avec vente dans la periode',
  unites: 'Unites vendues avant retours',
  clients: 'Clients distincts avec vente dans la periode',
  panier: 'CA facture / commandes distinctes, avant retours',
  remises: 'Remises HT sur les ventes',
  flux_cout_inconnu: 'Nombre de flux vente/retour dont le cout est inconnu',
  marge: 'Marge nette des retours, NULL si un cout est inconnu ou aucun flux',
  taux_marge: 'Marge / CA net ; NULL si cout inconnu ou CA net nul',
  objectif_ca: 'Objectif CA mensuel, uniquement global ou par mois/commercial'
};
const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const querySchema = z.object({
  debut: month,
  fin: month,
  dimension: z.enum(DIMENSIONS).optional(),
  mesures: z.array(z.enum(Object.keys(METRICS))).min(1).max(8),
}).strict();

export function buildQuery(input) {
  const args = querySchema.parse(input);
  if (args.debut > args.fin) throw new Error('La periode est inversee.');
  if (new Set(args.mesures).size !== args.mesures.length) throw new Error('Mesures repetees.');
  if (args.mesures.includes('objectif_ca') && args.dimension && !['MoisAnalyse', 'Commercial'].includes(args.dimension)) {
    throw new Error('Objectif disponible uniquement au grain mois/commercial.');
  }
  // Enumerated month literals only: no user expression or search syntax enters Qlik.
  const months = [];
  let [year, m] = args.debut.split('-').map(Number);
  while (`${year}-${String(m).padStart(2, '0')}` <= args.fin) {
    months.push(`'${year}-${String(m).padStart(2, '0')}'`);
    if (months.length > 36) throw new Error('Maximum 36 mois par requete.');
    if (++m > 12) { year++; m = 1; }
  }
  const set = types => `{1<MoisAnalyse={${months.join(',')}},TypeFlux={${types.map(t => `'${t}'`).join(',')}}>}`;
  const sale = set(['VENTE']), ret = set(['RETOUR']), net = set(['VENTE', 'RETOUR']);
  const sum = (s, field) => `Sum(${s} [${field}])`;
  const count = (s, field) => `Count(${s} DISTINCT [${field}])`;
  const revenue = sum(sale, 'CAFactureHT'), netRevenue = sum(net, 'CAFluxHT');
  const orders = count(sale, 'CommandeID'), unknown = sum(net, 'FlagCoutFluxInconnu');
  const knownMargin = `(${netRevenue}-${sum(net, 'CoutFluxHT')})`;
  const valid = `Count(${net} [FluxID])>0 and ${unknown}=0`;
  const expr = {
    ca_facture: revenue,
    remboursements: sum(ret, 'RemboursementHT'),
    ca_net: netRevenue,
    commandes: orders,
    unites: sum(sale, 'Quantite'),
    clients: count(sale, 'ClientID'),
    panier: `If(${orders}>0,${revenue}/${orders},Null())`,
    remises: sum(sale, 'RemiseHT'),
    flux_cout_inconnu: unknown,
    marge: `If(${valid},${knownMargin},Null())`,
    taux_marge: `If(${valid} and ${netRevenue}<>0,${knownMargin}/${netRevenue},Null())`,
    objectif_ca: sum(set(['OBJECTIF']), 'ObjectifCAHT')
  };
  return { args, dimension: args.dimension, measures: args.mesures.map(name => ({ name, expression: expr[name] })) };
}

const auditFields = [
  'Audit_LignesSource', 'Audit_LignesConservees', 'Audit_DoublonsExactsRetires',
  'Audit_CollisionsCleRestantes', 'Audit_LignesCoutManquant', 'Audit_LignesCommercialManquant',
  'Audit_DatesInvalides', 'AuditRetours_Orphelins', 'AuditRetours_IDRepetes',
  'AuditModele_Flux', 'AuditModele_Ventes', 'AuditModele_Retours',
  'AuditModele_Objectifs', 'AuditModele_DatesHorsCalendrier', 'AuditModele_FluxCoutInconnu'
];
export const auditQuery = {
  measures: [
    ...auditFields.map(name => ({ name, expression: `Only({1} [${name}])` })),
    { name: 'premiere_vente', expression: "Date(Min({1<TypeFlux={'VENTE'}>} DateAnalyse),'YYYY-MM-DD')" },
    { name: 'derniere_vente', expression: "Date(Max({1<TypeFlux={'VENTE'}>} DateAnalyse),'YYYY-MM-DD')" },
    { name: 'devise', expression: 'Only({1} Devise)' }
  ]
};
export const CATALOG = {
  version: '0.1.0', dimensions: DIMENSIONS, mesures: METRICS,
  regles: [
    'Qlik calcule les montants, ratios et comptages. Le LLM ne recalcule pas les chiffres.',
    'Periodes explicites YYYY-MM, inclusives. Verifier les dates des ventes avec bi_audit avant analyse.',
    'Le calendrier et les objectifs ne prouvent pas que des ventes existent sur toute la periode.',
    'Les requetes ignorent les selections utilisateur via {1}; aucune selection utilisateur n est effacee.',
    'La marge est NULL si un cout manque. Un NULL n est jamais un zero.',
    'MoisAnalyse suit DateAnalyse : vente au jour de vente, retour au jour du retour.',
    'Objectifs au grain mois/commercial ; ne pas les comparer a une periode commerciale incomplete.',
    'Une contribution ne prouve pas une cause. Chaque chiffre cite doit porter son trace_id.',
    'Prototype : un seul axe par requete, sans filtre libre ni expression libre.',
    'Si truncated=true, ne jamais presenter les lignes retournees comme une decomposition exhaustive.'
  ]
};
