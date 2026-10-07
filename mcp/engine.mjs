import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

const ALLOWED = new Set(['OpenDoc', 'GetTablesAndKeys', 'CreateSessionObject', 'GetLayout', 'DestroySessionObject']);
export async function connectEngine(config, transcript) {
  const ws = new WebSocket(config.url, { handshakeTimeout: 10000 });
  const pending = new Map();
  let id = 0;
  const rejectPending = () => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Connexion Qlik interrompue.')); }
    pending.clear();
  };
  ws.on('error', rejectPending);
  ws.on('close', rejectPending);
  ws.on('message', data => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { rejectPending(); ws.terminate(); return; }
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id); clearTimeout(p.timer);
    if (msg.error) p.reject(new Error(`Erreur Qlik ${msg.error.code ?? 'inconnue'}.`));
    else p.resolve(msg.result);
  });
  try {
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  } catch { ws.terminate(); throw new Error('Qlik Desktop inaccessible sur localhost:4848. Ouvrir Qlik Desktop.'); }
  const rpc = (handle, method, params) => {
    if (!ALLOWED.has(method)) throw new Error('Methode Qlik non autorisee.');
    if (ws.readyState !== WebSocket.OPEN) throw new Error('Connexion Qlik fermee.');
    // Do not log the private Windows path used for OpenDoc.
    transcript.push({ handle, method, params: method === 'OpenDoc' ? ['<application locale>'] : params });
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId); reject(new Error('Qlik ne repond pas apres 60 secondes.')); ws.terminate();
      }, 60000);
      pending.set(requestId, { resolve, reject, timer });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: requestId, handle, method, params }), error => {
        if (error) { clearTimeout(timer); pending.delete(requestId); reject(new Error('Envoi Qlik impossible.')); }
      });
    });
  };
  const close = () => { rejectPending(); ws.terminate(); };
  try {
    const result = await rpc(-1, 'OpenDoc', [config.appPath]);
    const app = result?.qReturn?.qHandle;
    if (!Number.isInteger(app)) throw new Error('Qlik n a pas ouvert l application.');
    return { rpc, app, close };
  } catch (error) { close(); throw error; }
}

export async function getFields(session) {
  const result = await session.rpc(session.app, 'GetTablesAndKeys', [
    { qcx: 1000, qcy: 1000 }, { qcx: 0, qcy: 0 }, 30, true, false, false
  ]);
  return new Set((result.qtr ?? []).flatMap(t => (t.qFields ?? []).map(f => f.qName)));
}

export function decodeCell(cell) {
  return { value: cell.qIsNull || !Number.isFinite(cell.qNum) ? null : cell.qNum,
    text: cell.qText ?? '', is_null: !!cell.qIsNull };
}

export async function readCube(session, query) {
  const width = query.measures.length + (query.dimension ? 1 : 0);
  const limit = Math.min(1000, Math.floor(10000 / width));
  const objectId = `bi-read-${randomUUID()}`;
  const definition = {
    qInfo: { qId: objectId, qType: 'bi-investigator-read' },
    qHyperCubeDef: {
      qMode: 'S', qSuppressZero: false, qSuppressMissing: false,
      qDimensions: query.dimension ? [{ qDef: { qFieldDefs: [query.dimension], qSortCriterias: [{ qSortByAscii: 1 }] }, qNullSuppression: false }] : [],
      qMeasures: query.measures.map(m => ({ qDef: { qDef: m.expression, qLabel: m.name } })),
      qInitialDataFetch: [{ qLeft: 0, qTop: 0, qWidth: width, qHeight: limit }]
    }
  };
  let created = false;
  try {
    const res = await session.rpc(session.app, 'CreateSessionObject', [definition]);
    created = true;
    const layout = await session.rpc(res.qReturn.qHandle, 'GetLayout', []);
    const cube = layout.qLayout?.qHyperCube;
    if (!cube || cube.qError?.qErrorCode || [...(cube.qDimensionInfo ?? []), ...(cube.qMeasureInfo ?? [])].some(i => i.qError?.qErrorCode)) {
      throw new Error('Hypercube Qlik invalide : champs ou expressions a verifier.');
    }
    const matrix = (cube.qDataPages ?? []).flatMap(page => page.qMatrix ?? []);
    if (!Number.isInteger(cube.qSize?.qcy)) throw new Error('Taille du resultat Qlik absente.');
    return {
      columns: [...(query.dimension ? [query.dimension] : []), ...query.measures.map(m => m.name)],
      rows: matrix.map(row => row.map(decodeCell)),
      total_rows: cube.qSize.qcy,
      truncated: cube.qSize.qcy > matrix.length,
      expressions: query.measures
    };
  } finally {
    if (created) await session.rpc(session.app, 'DestroySessionObject', [objectId]);
  }
}
