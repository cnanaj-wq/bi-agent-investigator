import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { buildQuery, auditQuery } from './catalog.mjs';
import { connectEngine, getFields, readCube } from './engine.mjs';

const base = new URL('./', import.meta.url);
export async function loadConfig() {
  let config;
  try { config = JSON.parse((await readFile(new URL('config.local.json', base), 'utf8')).replace(/^\uFEFF/, '')); }
  catch { throw new Error('Configuration absente/invalide. Executer mcp/configurer.ps1.'); }
  if (typeof config.appPath !== 'string' || !config.appPath.toLowerCase().endsWith('.qvf')) throw new Error('Chemin QVF invalide.');
  // This adapter is specifically for the local Qlik Sense Desktop lab.
  if (config.url !== 'ws://localhost:4848/app/') throw new Error('URL Qlik Desktop non autorisee.');
  return config;
}
export async function run(tool, input = {}, dependencies = {}) {
  const query = tool === 'bi_audit' ? auditQuery : tool === 'bi_query' ? buildQuery(input) : null;
  if (!query) throw new Error('Outil inconnu.');
  const trace_id = randomUUID();
  const trace = { trace_id, started_at: new Date().toISOString(), version: '0.1.0', tool, input, rpc: [] };
  const logDir = dependencies.logDir ?? fileURLToPath(new URL('logs/', base));
  await mkdir(logDir, { recursive: true });
  const logPath = `${logDir}/${trace_id}.json`;
  // Refuse unjournalled Qlik calls if the initial trace cannot be persisted.
  await writeFile(logPath, JSON.stringify(trace, null, 2), { flag: 'wx' });
  let session;
  let result;
  let failure;
  try {
    const config = await (dependencies.loadConfig ?? loadConfig)();
    session = await (dependencies.connect ?? connectEngine)(config, trace.rpc);
    const fields = await getFields(session);
    // Check the fixed lab model before calculating. Never silently treat absent costs as zero.
    const required = tool === 'bi_audit'
      ? query.measures.map(m => m.name).filter(n => n.startsWith('Audit')).concat(['TypeFlux', 'DateAnalyse', 'Devise'])
      : ['MoisAnalyse', 'TypeFlux', 'FluxID', 'CAFactureHT', 'CAFluxHT', 'CoutFluxHT', 'FlagCoutFluxInconnu',
         'CommandeID', 'Quantite', 'ClientID', 'RemiseHT', 'RemboursementHT', 'ObjectifCAHT', ...(query.dimension ? [query.dimension] : [])];
    const missing = required.filter(f => !fields.has(f));
    if (missing.length) throw new Error(`Modele du lab incomplet. Champs absents : ${missing.join(', ')}.`);
    result = { trace_id, engine: 'Qlik', scope: tool === 'bi_audit' ? 'Audit global au dernier rechargement' : query.args,
      ...(await readCube(session, query)) };
    trace.result = result;
  } catch (error) {
    failure = new Error(`${error.message} Trace : ${trace_id}`);
    trace.error = failure.message;
  } finally {
    session?.close();
    trace.finished_at = new Date().toISOString();
    await writeFile(logPath, JSON.stringify(trace, null, 2));
  }
  if (failure) throw failure;
  return result;
}
