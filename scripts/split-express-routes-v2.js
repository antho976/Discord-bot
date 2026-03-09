/**
 * Script to split express-routes.js into 6 domain-specific route files.
 * Uses exact contiguous line ranges verified manually.
 * 
 * Usage: node scripts/split-express-routes-v2.js
 */
import fs from 'fs';
import path from 'path';

const SRC = 'modules/express-routes.js';
const OUT_DIR = 'modules/routes';
const lines = fs.readFileSync(SRC, 'utf-8').split('\n');
console.log(`Read ${lines.length} lines from express-routes.js`);

fs.mkdirSync(OUT_DIR, { recursive: true });

// Deps block (lines 9-22 in the original, 0-indexed: 8-21)
const depsBlock = lines.slice(8, 22).join('\n');

// Section definitions: [name, funcName, startLine(1-indexed), endLine(1-indexed), desc, returnsNotify]
const sections = [
  ['page-routes',     'registerPageRoutes',     24,  251,  'Page render routes, log API, healthz, community pages', false],
  ['pets-routes',     'registerPetsRoutes',     252,  900,  'Pet system: SSE, CRUD, giveaways, approvals, auto-cancel', true],
  ['twitch-routes',   'registerTwitchRoutes',   902, 1274,  'Twitch OAuth, stream controls, token refresh, VIPs, health-data, stream APIs', false],
  ['config-routes',   'registerConfigRoutes',  1276, 2183,  'Config, settings, suggestions, welcome, audit, commands, upload', false],
  ['leveling-routes', 'registerLevelingRoutes', 2185, 2652,  'Leveling system routes: users, edit, config, sync-roles, CSV, prestige', false],
  ['events-routes',   'registerEventsRoutes',  2654, 3728,  'Notifications, YouTube alerts, custom commands, events, giveaways, polls, reminders', false],
];

for (const [name, funcName, startLine, endLine, desc, returnsNotify] of sections) {
  // Extract lines (convert 1-indexed to 0-indexed)
  const extracted = lines.slice(startLine - 1, endLine).join('\n');
  const returnLine = returnsNotify ? '\n  return { notifyPetsChange };\n' : '';
  
  const content = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * ${desc}
 */
export function ${funcName}(app, deps) {
${depsBlock}

${extracted}
${returnLine}}
`;

  const outPath = path.join(OUT_DIR, `${name}.js`);
  fs.writeFileSync(outPath, content, 'utf-8');
  const lineCount = content.split('\n').length;
  console.log(`Wrote ${outPath} (${lineCount} lines)`);
}

// ========== Create orchestrator ==========
const orchestrator = `import { registerPageRoutes } from './routes/page-routes.js';
import { registerPetsRoutes } from './routes/pets-routes.js';
import { registerTwitchRoutes } from './routes/twitch-routes.js';
import { registerConfigRoutes } from './routes/config-routes.js';
import { registerLevelingRoutes } from './routes/leveling-routes.js';
import { registerEventsRoutes } from './routes/events-routes.js';

/**
 * Express Routes — orchestrator
 * Delegates to domain-specific route modules in ./routes/
 */
export function registerExpressRoutes(app, deps) {
  registerPageRoutes(app, deps);
  const { notifyPetsChange } = registerPetsRoutes(app, deps);
  registerTwitchRoutes(app, deps);
  registerConfigRoutes(app, deps);
  registerLevelingRoutes(app, deps);
  registerEventsRoutes(app, deps);

  return { notifyPetsChange };
}
`;

fs.copyFileSync(SRC, SRC + '.bak');
fs.writeFileSync(SRC, orchestrator, 'utf-8');
console.log(`\\nWrote orchestrator ${SRC} (${orchestrator.split('\\n').length} lines)`);
console.log('Done!');

