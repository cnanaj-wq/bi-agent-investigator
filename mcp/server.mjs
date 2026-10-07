import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { CATALOG, querySchema } from './catalog.mjs';
import { run } from './service.mjs';

const content = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
serveStdio(() => {
  const server = new McpServer({ name: 'bi-agent-investigator', version: '0.1.0' });
  server.registerTool('bi_catalogue', {
    description: 'Lire les KPI autorises et les limites avant toute enquete. Aucun chiffre de reference.',
    inputSchema: z.object({}).strict(), annotations
  }, async () => content(CATALOG));
  for (const [name, description, inputSchema] of [
    ['bi_audit', 'Lire dans Qlik les audits globaux et les dates reelles des ventes. A appeler avant analyse.', z.object({}).strict()],
    ['bi_query', 'Faire calculer par Qlik les KPI sur des mois explicites, avec un axe facultatif. Resultat trace. Aucun calcul libre.', querySchema]
  ]) {
    server.registerTool(name, { description, inputSchema, annotations }, async args => {
      try { return content(await run(name, args)); }
      catch (error) { return { ...content({ error: error.message }), isError: true }; }
    });
  }
  return server;
});
console.error('BI Agent MCP pret sur stdio. En attente du client MCP.');
