import { run } from './service.mjs';
try {
  const result = await run('bi_audit');
  console.log('Connexion Qlik reussie. Audit lu dans le moteur :');
  const row = result.rows[0];
  if (!row || result.truncated) throw new Error('Audit vide ou incomplet.');
  result.columns.forEach((name, i) => console.log(`${name} : ${row[i].is_null ? 'NULL' : row[i].text || row[i].value}`));
  console.log(`Trace : ${result.trace_id}`);
  console.log('Le transport et l audit sont verifies ; les KPI restent a valider dans Qlik.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
