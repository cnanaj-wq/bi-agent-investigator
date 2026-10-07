import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';
import { buildQuery, auditQuery } from '../catalog.mjs';
import { decodeCell, readCube, connectEngine } from '../engine.mjs';
import { run } from '../service.mjs';

const input = { debut: '2025-10', fin: '2026-09', mesures: ['ca_net', 'marge'] };
test('refuse expressions libres, mois invalides, periodes excessives et objectifs sans grain', () => {
  for (const args of [
    { ...input, expression: 'DoSave()' }, { ...input, mesures: ['Sum(CAFluxHT)'] },
    { ...input, debut: "2025-10'}>}" }, { ...input, debut: '2026-13' },
    { ...input, debut: '2026-10' }, { ...input, debut: '2020-01' },
    { ...input, mesures: ['objectif_ca'], dimension: 'Produit' }
  ]) assert.throws(() => buildQuery(args));
});
test('requete conserve le garde de marge et ignore les selections courantes', () => {
  const query = buildQuery(input);
  assert.match(query.measures[0].expression, /\{1</);
  const margin = query.measures[1].expression;
  assert.match(margin, /FlagCoutFluxInconnu/);
  assert.match(margin, /Null\(\)/);
  assert.match(margin, /Count\(/);
  assert.ok(margin.includes("'2025-10','2025-11','2025-12','2026-01'"));
});
test('un NULL Qlik reste NULL et le texte des dates est preserve', () => {
  assert.equal(decodeCell({ qNum: 0, qIsNull: true, qText: '-' }).value, null);
  assert.equal(decodeCell({ qNum: 'NaN', qText: '-' }).value, null);
  assert.equal(decodeCell({ qNum: 0, qText: '0' }).value, 0);
  assert.equal(decodeCell({ qNum: 45000, qText: '2023-03-15' }).text, '2023-03-15');
});
function mockSession({ error = false, fields = [] } = {}) {
  const calls = [];
  return { app: 1, calls, closed: false, close() { this.closed = true; },
    async rpc(handle, method, params) {
      calls.push({ handle, method, params });
      if (method === 'GetTablesAndKeys') return { qtr: [{ qFields: fields.map(qName => ({ qName })) }] };
      if (method === 'CreateSessionObject') return { qReturn: { qHandle: 2 } };
      if (method === 'GetLayout') {
        if (error) return { qLayout: { qHyperCube: { qError: { qErrorCode: 7005 } } } };
        return { qLayout: { qHyperCube: { qSize: { qcy: 2000 }, qDataPages: [{ qMatrix: [[{ qNum: 42, qText: '42' }]] }] } } };
      }
      if (method === 'DestroySessionObject') return { qSuccess: true };
      throw new Error('RPC inattendu');
    }
  };
}
test('troncature explicite et destruction de l objet temporaire', async () => {
  const session = mockSession();
  const result = await readCube(session, buildQuery(input));
  assert.equal(result.truncated, true);
  assert.equal(result.rows[0][0].value, 42);
  assert.equal(session.calls.at(-1).method, 'DestroySessionObject');
});
test('erreur de calcul Qlik refusee et objet temporaire detruit', async () => {
  const session = mockSession({ error: true });
  await assert.rejects(readCube(session, buildQuery(input)), /invalide/);
  assert.equal(session.calls.at(-1).method, 'DestroySessionObject');
});
test('modele incomplet refuse avant calcul, connexion fermee et erreur journalisee', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'bi-test-'));
  const session = mockSession();
  try {
    await assert.rejects(run('bi_query', input, { logDir, loadConfig: async () => ({}), connect: async () => session }), /Champs absents/);
    assert.equal(session.closed, true);
    assert.equal(session.calls.length, 1);
    const files = await readdir(logDir);
    const trace = JSON.parse(await readFile(join(logDir, files[0]), 'utf8'));
    assert.match(trace.error, /Modele du lab incomplet/);
    assert.ok(trace.finished_at);
  } finally { await rm(logDir, { recursive: true }); }
});
test('une reponse est retrouvee a l identique par son UUID dans le journal', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'bi-test-'));
  const fields = auditQuery.measures.map(m => m.name).filter(n => n.startsWith('Audit')).concat(['TypeFlux', 'DateAnalyse', 'Devise']);
  const session = mockSession({ fields });
  try {
    const result = await run('bi_audit', {}, { logDir, loadConfig: async () => ({}), connect: async () => session });
    const trace = JSON.parse(await readFile(join(logDir, `${result.trace_id}.json`), 'utf8'));
    assert.deepEqual(trace.result, result);
    assert.equal(session.closed, true);
  } finally { await rm(logDir, { recursive: true }); }
});
test('transport QIX reel sur serveur simule : liste fermee et chemin masque', async () => {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(server, 'listening');
  server.on('connection', ws => ws.on('message', data => {
    const request = JSON.parse(data.toString());
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { qReturn: { qHandle: 1 } } }));
  }));
  const transcript = [];
  let session;
  try {
    session = await connectEngine({ url: `ws://127.0.0.1:${server.address().port}`, appPath: 'private-test.qvf' }, transcript);
    assert.equal(session.app, 1);
    assert.throws(() => session.rpc(1, 'DoSave', []), /non autorisee/);
    assert.ok(!JSON.stringify(transcript).includes('private-test'));
  } finally {
    session?.close();
    for (const client of server.clients) client.terminate();
    await new Promise(resolve => server.close(resolve));
  }
});
test('MCP stdio expose exactement les trois outils et refuse une expression libre', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  const reader = createInterface({ input: child.stdout });
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  reader.on('line', line => {
    const msg = JSON.parse(line);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  child.on('exit', () => { for (const resolve of pending.values()) resolve({ error: stderr }); });
  let id = 0;
  const send = (method, params) => new Promise(resolve => {
    pending.set(++id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  try {
    const init = await send('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    assert.ok(init.result, JSON.stringify(init));
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const list = await send('tools/list', {});
    assert.deepEqual(list.result.tools.map(t => t.name).sort(), ['bi_audit', 'bi_catalogue', 'bi_query']);
    const catalog = await send('tools/call', { name: 'bi_catalogue', arguments: {} });
    assert.equal(JSON.parse(catalog.result.content[0].text).version, '0.1.0');
    const invalid = await send('tools/call', { name: 'bi_query', arguments: { ...input, expression: '1+1' } });
    assert.ok(invalid.error || invalid.result?.isError);
  } finally { child.kill(); reader.close(); }
});
