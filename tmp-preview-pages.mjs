/**
 * Extract the login, signup, and select-server HTML pages as static files
 * so you can preview them in a browser without running the full bot.
 *
 * Usage: node tmp-preview-pages.mjs
 * Then open the generated files in /tmp/preview/
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync('index.js', 'utf8');
const outDir = '/tmp/preview';
fs.mkdirSync(outDir, { recursive: true });

// Copy CSS + JS assets
for (const f of ['dashboard.css', 'login.js', 'select-server.js', 'signup.js']) {
  const p = path.join('public', f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(outDir, f));
  }
}

/**
 * Strip all ${...} template expressions, handling nested braces/quotes.
 * Optionally replace with static content.
 */
function stripTemplateExprs(html, replacements = {}) {
  let result = '';
  let i = 0;
  while (i < html.length) {
    if (html[i] === '$' && html[i + 1] === '{') {
      // Find the matching closing brace, respecting nesting and strings
      let depth = 1;
      let j = i + 2;
      const exprStart = i;
      while (j < html.length && depth > 0) {
        const ch = html[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === "'" || ch === '"' || ch === '`') {
          // Skip string literal
          const quote = ch;
          j++;
          while (j < html.length && html[j] !== quote) {
            if (html[j] === '\\') j++; // skip escaped char
            j++;
          }
        }
        j++;
      }
      const expr = html.slice(exprStart, j);

      // Check if any replacement key matches inside this expression
      let replaced = false;
      for (const [key, val] of Object.entries(replacements)) {
        if (expr.includes(key)) {
          result += val;
          replaced = true;
          break;
        }
      }
      if (!replaced) result += ''; // strip unknown expressions
      i = j;
    } else {
      result += html[i];
      i++;
    }
  }
  return result;
}

function extractPage(titleSearch, outName, replacements = {}) {
  const idx = src.indexOf(titleSearch);
  if (idx === -1) { console.error(`Could not find: ${titleSearch}`); return; }
  const start = src.lastIndexOf('<!DOCTYPE', idx);
  const end = src.indexOf('</html>`', idx);
  if (start === -1 || end === -1) { console.error(`Could not delimit: ${outName}`); return; }
  let html = src.slice(start, end + 7);
  html = stripTemplateExprs(html, replacements);
  // Fix unicode escapes that appear as literal text
  html = html.replace(/\\u26A0\\uFE0F/g, '\u26A0\uFE0F')
             .replace(/\\u2705/g, '\u2705')
             .replace(/\\u2190/g, '\u2190')
             .replace(/\\u\{1F441\}\\uFE0F/g, '\u{1F441}\uFE0F')
             .replace(/\\u\{1F512\}/g, '\u{1F512}');
  fs.writeFileSync(path.join(outDir, outName), html);
  console.log(`\u2705 ${outName}`);
}

// Sample server cards for select-server
const sampleCards = `
  <button class="server-card" data-guild-id="1">
    <div class="server-icon"><span>TS</span></div>
    <div class="server-info"><div class="server-name">Test Server</div><div class="server-meta">42 members</div></div>
    <span class="server-arrow">\u203A</span>
  </button>
  <button class="server-card" data-guild-id="2">
    <div class="server-icon"><span>GG</span></div>
    <div class="server-info"><div class="server-name">Gaming Guild</div><div class="server-meta">128 members</div></div>
    <span class="server-arrow">\u203A</span>
  </button>
  <button class="server-card" data-guild-id="3">
    <div class="server-icon"><span>NP</span></div>
    <div class="server-info"><div class="server-name">nephilheim Production</div><div class="server-meta">2,401 members</div></div>
    <span class="server-arrow">\u203A</span>
  </button>`;

// --- LOGIN ---
extractPage('<title>nephilheim Bot', 'login.html', {
  'error': '',           // hide error alert
  'created': '',         // hide success alert
  'DISCORD_CLIENT_ID': '<a href="#" class="discord-login-btn"><svg width="20" height="15" viewBox="0 0 71 55" fill="none"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 44.7a.2.2 0 00.1.2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01-.02-.36 30.4 30.4 0 001.1-.9.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 01-.01.36 36.2 36.2 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1 58.5 58.5 0 0017.7-9 .2.2 0 00.1-.2c1.5-15.6-2.6-29.2-10.9-41.2zM23.7 36.7c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3zm24 0c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3z" fill="white"/></svg>Login with Discord</a>',
  'csrfToken': 'preview-token',
});

// --- SIGNUP ---
extractPage('<title>nephilheim Bot \u2014 Create Account', 'signup.html', {
  'errorMsg': '', // hide error
});

// --- SELECT SERVER ---
extractPage('<title>Select Server</title>', 'select-server.html', {
  'guildCards': sampleCards,
  'req.userName': 'antho976',
  'TIER_COLORS': '#9146ff',
  'TIER_LABELS': 'Admin',
});

console.log(`\n\u{1F4C2} Preview files in: ${outDir}/`);
console.log('Open: http://localhost:3333/login.html');
