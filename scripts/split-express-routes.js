/**
 * Script to split express-routes.js into 6 domain-specific route files.
 * 
 * Pattern: Main file becomes thin orchestrator; each sub-file exports a
 * register function that takes (app, deps).
 * 
 * Usage: node scripts/split-express-routes.js
 */
import fs from 'fs';
import path from 'path';

const SRC = 'modules/express-routes.js';
const OUT_DIR = 'modules/routes';
const lines = fs.readFileSync(SRC, 'utf-8').split('\n');
console.log(`Read ${lines.length} lines from express-routes.js`);

// Make output directory
fs.mkdirSync(OUT_DIR, { recursive: true });

// Define route groups by line ranges (1-based in comments, 0-based in array)
// These ranges are INCLUSIVE of the route definition lines
const groups = {
  'page-routes': {
    desc: 'Simple renderPage GET routes and static assets',
    ranges: [
      [20, 120],  // app.get('/', ...) through app.get('/settings', ...)
      [120, 125], // favicon, dashboard-actions.js
      [215, 248], // healthz, health, audit, embeds, customcmds, accounts, moderation, tickets, reaction-roles, scheduled-msgs, automod, starboard, dash-audit, bot-status
      [2652, 2653], // notifications page
      [2661, 2661], // youtube-alerts page
      [2814, 2814], // customcmds (duplicate)
      [3000, 3003], // events pages, giveaways, polls, reminders pages
    ],
  },
  'pets-routes': {
    desc: 'Pet management API routes',
    ranges: [[248, 937]],  // /api/pets/stream through /api/pets/giveaway/stats
  },
  'twitch-routes': {
    desc: 'Twitch auth, stream controls, VIPs, health data',
    ranges: [[937, 1191]], // /auth/twitch through api/stream-history end
  },
  'leveling-routes': {
    desc: 'Leveling system routes',
    ranges: [
      [126, 214], // leveling page, welcome page through bot-status handlers
      [2181, 2651], // /leveling/users through /dashboard/levelupchannel
    ],
  },
  'config-routes': {
    desc: 'Config, settings, suggestions, notifications, youtube-alerts, custom commands, upload, logs, audit APIs',
    ranges: [
      [1191, 2181], // api/stream-goals through /channelname
      [2653, 2813], // /notifications/save through /youtube-alerts/data
      [2815, 2999], // /customcmd/add through /upload/image
    ],
  },
  'events-routes': {
    desc: 'Giveaway, poll, reminder, and embed routes',
    ranges: [[3003, 3727]], // /discord/user through reminders
  },
};

// ========== Read the file and extract route blocks ==========
// First, identify the deps destructuring block (shared by all sub-files)
const depsStartLine = lines.findIndex(l => l.includes('const {'));
let depsEndLine = depsStartLine;
for (let i = depsStartLine; i < lines.length; i++) {
  if (lines[i].includes('} = deps;')) { depsEndLine = i; break; }
}
const depsBlock = lines.slice(depsStartLine, depsEndLine + 1).join('\n');
console.log(`Deps block: lines ${depsStartLine + 1}-${depsEndLine + 1}`);

// Find notifyPetsChange function definition (inside pets section)
const notifyLine = lines.findIndex(l => l.includes('function notifyPetsChange'));
console.log(`notifyPetsChange defined at line ${notifyLine + 1}`);

// For each group, extract lines and create the sub-route file
for (const [name, config] of Object.entries(groups)) {
  const extractedLines = [];
  
  for (const [start, end] of config.ranges) {
    // Collect lines (0-based: start-1 to end-1)
    for (let i = start - 1; i < Math.min(end, lines.length); i++) {
      extractedLines.push(lines[i]);
    }
    extractedLines.push(''); // blank separator between ranges
  }
  
  // For pets-routes, include notifyPetsChange function if in range
  const hasNotify = name === 'pets-routes';
  
  // Build the sub-route file
  const returnLine = hasNotify ? '\n  return { notifyPetsChange };' : '';
  const exportName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^([a-z])/, (_, c) => c.toUpperCase());
  const funcName = `register${exportName}`;
  
  const content = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * ${config.desc}
 */
export function ${funcName}(app, deps) {
  ${depsBlock}

${extractedLines.join('\n')}
${returnLine}
}
`;
  
  const outPath = path.join(OUT_DIR, `${name}.js`);
  fs.writeFileSync(outPath, content, 'utf-8');
  const lineCount = content.split('\n').length;
  console.log(`Wrote ${outPath} (${lineCount} lines, ${extractedLines.length} route lines)`);
}

// ========== Create the orchestrator express-routes.js ==========
const orchestrator = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerPageRoutes } from './routes/page-routes.js';
import { registerPetsRoutes } from './routes/pets-routes.js';
import { registerTwitchRoutes } from './routes/twitch-routes.js';
import { registerLevelingRoutes } from './routes/leveling-routes.js';
import { registerConfigRoutes } from './routes/config-routes.js';
import { registerEventsRoutes } from './routes/events-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Express Routes — orchestrator
 * Delegates to domain-specific route modules in ./routes/
 */
export function registerExpressRoutes(app, deps) {
  registerPageRoutes(app, deps);
  const { notifyPetsChange } = registerPetsRoutes(app, deps);
  registerTwitchRoutes(app, deps);
  registerLevelingRoutes(app, deps);
  registerConfigRoutes(app, deps);
  registerEventsRoutes(app, deps);

  return { notifyPetsChange };
}
`;

// Back up the original
fs.copyFileSync(SRC, SRC + '.bak');
console.log(`\\nBacked up original to ${SRC}.bak`);
fs.writeFileSync(SRC, orchestrator, 'utf-8');
console.log(`Wrote orchestrator ${SRC} (${orchestrator.split('\\n').length} lines)`);

console.log('\\nDone! express-routes.js is now a thin orchestrator with 6 sub-route files.');
