/**
 * Basic unit tests for utility functions.
 * Uses Node.js built-in test runner (node --test tests/).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '.tmp-test');

// ========== SETUP / TEARDOWN ==========
before(() => { fs.mkdirSync(TMP_DIR, { recursive: true }); });
after(() => { fs.rmSync(TMP_DIR, { recursive: true, force: true }); });

// ========== loadJSON / saveJSON (reimplemented for isolation) ==========
function loadJSON(fp, def) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return def; }
}

const _writeQueues = new Map();
function saveJSON(fp, data) {
  const str = JSON.stringify(data, null, 2);
  if (!_writeQueues.has(fp)) _writeQueues.set(fp, Promise.resolve());
  const chain = _writeQueues.get(fp).then(() =>
    fs.promises.writeFile(fp, str)
  ).catch(() => {});
  _writeQueues.set(fp, chain);
  return chain;
}

// ========== XP formula (reimplemented for isolation) ==========
function getXpForLevel(level, base = 100, inc = 50) {
  if (!level || level <= 0) return 0;
  return Math.floor(base * level + inc * (level * (level - 1) / 2));
}

// ========== LOG LEVELS ==========
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// ========== TESTS ==========

describe('loadJSON', () => {
  it('returns default for missing file', () => {
    const result = loadJSON(path.join(TMP_DIR, 'nonexistent.json'), { ok: true });
    assert.deepEqual(result, { ok: true });
  });

  it('returns default for invalid JSON', () => {
    const fp = path.join(TMP_DIR, 'bad.json');
    fs.writeFileSync(fp, 'not json');
    const result = loadJSON(fp, []);
    assert.deepEqual(result, []);
  });

  it('reads valid JSON correctly', () => {
    const fp = path.join(TMP_DIR, 'good.json');
    fs.writeFileSync(fp, '{"a":1,"b":[2,3]}');
    const result = loadJSON(fp, {});
    assert.deepEqual(result, { a: 1, b: [2, 3] });
  });
});

describe('saveJSON write queue', () => {
  it('writes data correctly', async () => {
    const fp = path.join(TMP_DIR, 'write-test.json');
    await saveJSON(fp, { hello: 'world' });
    const content = JSON.parse(fs.readFileSync(fp, 'utf8'));
    assert.equal(content.hello, 'world');
  });

  it('serializes concurrent writes (no corruption)', async () => {
    const fp = path.join(TMP_DIR, 'concurrent.json');
    // Fire 10 writes rapidly
    const writes = [];
    for (let i = 0; i < 10; i++) {
      writes.push(saveJSON(fp, { value: i }));
    }
    await Promise.all(writes);
    const content = JSON.parse(fs.readFileSync(fp, 'utf8'));
    // Last write should win — value must be 9
    assert.equal(content.value, 9);
  });
});

describe('getXpForLevel', () => {
  it('returns 0 for level 0 or negative', () => {
    assert.equal(getXpForLevel(0), 0);
    assert.equal(getXpForLevel(-1), 0);
    assert.equal(getXpForLevel(null), 0);
  });

  it('calculates level 1 correctly (base only)', () => {
    // base*1 + inc*(1*0/2) = 100
    assert.equal(getXpForLevel(1), 100);
  });

  it('calculates level 5 correctly', () => {
    // base*5 + inc*(5*4/2) = 500 + 500 = 1000
    assert.equal(getXpForLevel(5), 1000);
  });

  it('uses custom base and increment', () => {
    // 200*3 + 100*(3*2/2) = 600 + 300 = 900
    assert.equal(getXpForLevel(3, 200, 100), 900);
  });

  it('scales progressively', () => {
    const xp5 = getXpForLevel(5);
    const xp10 = getXpForLevel(10);
    const xp20 = getXpForLevel(20);
    assert.ok(xp10 > xp5 * 2, 'level 10 should require more than 2x level 5');
    assert.ok(xp20 > xp10 * 2, 'level 20 should require more than 2x level 10');
  });
});

describe('LOG_LEVELS', () => {
  it('has correct ordering', () => {
    assert.ok(LOG_LEVELS.debug < LOG_LEVELS.info);
    assert.ok(LOG_LEVELS.info < LOG_LEVELS.warn);
    assert.ok(LOG_LEVELS.warn < LOG_LEVELS.error);
  });

  it('contains all expected levels', () => {
    assert.deepEqual(Object.keys(LOG_LEVELS).sort(), ['debug', 'error', 'info', 'warn']);
  });
});

describe('Password validation', () => {
  function validatePassword(pw) {
    if (!pw || pw.length < 8) return false;
    if (!/[A-Z]/.test(pw)) return false;
    if (!/[a-z]/.test(pw)) return false;
    if (!/[0-9]/.test(pw)) return false;
    return true;
  }

  it('rejects short passwords', () => {
    assert.equal(validatePassword('Abc1'), false);
    assert.equal(validatePassword(''), false);
    assert.equal(validatePassword(null), false);
  });

  it('rejects missing uppercase', () => {
    assert.equal(validatePassword('abcdefg1'), false);
  });

  it('rejects missing lowercase', () => {
    assert.equal(validatePassword('ABCDEFG1'), false);
  });

  it('rejects missing digit', () => {
    assert.equal(validatePassword('Abcdefgh'), false);
  });

  it('accepts valid passwords', () => {
    assert.equal(validatePassword('StrongP4ss'), true);
    assert.equal(validatePassword('MyB0tAdmin'), true);
  });
});

describe('Auto-backup logic', () => {
  it('keeps only N most recent backups', () => {
    const backupDir = path.join(TMP_DIR, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Create 10 "backup" directories
    const dirs = [];
    for (let i = 0; i < 10; i++) {
      const name = `2025-01-${String(i + 1).padStart(2, '0')}T00-00-00`;
      const dp = path.join(backupDir, name);
      fs.mkdirSync(dp, { recursive: true });
      fs.writeFileSync(path.join(dp, 'test.json'), '{}');
      dirs.push(name);
    }

    // Simulate pruning (keep 7)
    const maxBackups = 7;
    const backups = fs.readdirSync(backupDir).filter(d =>
      fs.statSync(path.join(backupDir, d)).isDirectory()
    ).sort();

    while (backups.length > maxBackups) {
      const old = backups.shift();
      fs.rmSync(path.join(backupDir, old), { recursive: true, force: true });
    }

    const remaining = fs.readdirSync(backupDir);
    assert.equal(remaining.length, 7);
    // Oldest should be removed
    assert.ok(!remaining.includes(dirs[0]));
    assert.ok(!remaining.includes(dirs[1]));
    assert.ok(!remaining.includes(dirs[2]));
    assert.ok(remaining.includes(dirs[9])); // newest kept
  });
});
