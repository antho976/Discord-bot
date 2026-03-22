/**
 * Security middleware & utilities module
 * Handles: helmet, CORS, CSRF, WAF, input sanitization, rate limiting, encryption
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';

// ========== HELMET (security headers) ==========
export function setupHelmet(app) {
  // Generate a per-request CSP nonce for inline scripts
  app.use((req, res, next) => {
    req.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: false, // handled below with per-request nonce
    crossOriginEmbedderPolicy: false, // breaks image loading from external URLs
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  // Custom CSP with per-request nonce
  app.use((req, res, next) => {
    const n = req.cspNonce;
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      `script-src 'self' 'nonce-${n}' https://cdn.jsdelivr.net`,
      "script-src-attr 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://cdn.discordapp.com https://media.discordapp.net",
      "connect-src 'self' wss: ws: https://cdn.jsdelivr.net",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '));
    next();
  });
}

// ========== CORS BLOCKING ==========
// Dashboard is same-origin only. Block any cross-origin requests explicitly.
// Only applies to API/data routes — form posts and page navigation are exempt.
export function setupCorsBlock(app) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();

    // Form submissions (POST with redirect responses) and page navigations are same-site by nature
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) return next();

    const host = req.headers.host || req.hostname;
    // Extract hostname from origin URL for comparison
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return next();
    } catch { /* invalid origin URL */ }
    // Also allow if origin matches the forwarded host (behind reverse proxy)
    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost && origin.includes(forwardedHost)) return next();
    // Compare against just the hostname (without port) as a fallback
    try {
      const originHostname = new URL(origin).hostname;
      if (originHostname === (req.hostname || host.split(':')[0])) return next();
    } catch { /* ignore */ }
    return res.status(403).json({ success: false, error: 'Cross-origin requests not allowed' });
  });
}

// ========== BODY SIZE LIMIT ==========
export function bodyLimitOptions() {
  return { limit: '1mb' };
}

// ========== CSRF DOUBLE-SUBMIT COOKIE ==========
const _csrfTokens = new Map(); // sessionToken -> csrfToken
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set(['/auth', '/signup', '/auth/discord', '/auth/discord/callback', '/api/v1/']); // login + signup + OAuth + public API

export function setupCsrf(app, getSessionFromCookie) {
  // Generate CSRF token on every authenticated page load
  app.use((req, res, next) => {
    if (CSRF_SAFE_METHODS.has(req.method)) {
      const session = getSessionFromCookie(req);
      if (session) {
        const cookieStr = req.headers.cookie || '';
        const sessionToken = cookieStr.match(/session=([^;]+)/)?.[1];
        if (sessionToken) {
          let csrf = _csrfTokens.get(sessionToken);
          if (!csrf) {
            csrf = crypto.randomBytes(32).toString('hex');
            _csrfTokens.set(sessionToken, csrf);
          }
          res.setHeader('X-CSRF-Token', csrf);
          // Set as cookie so frontend JS can read it
          res.setHeader('Set-Cookie', [
            res.getHeader('Set-Cookie') || [],
            `_csrf=${csrf}; Path=/; SameSite=Strict; Secure`
          ].flat().filter(Boolean));
        }
      }
    }
    next();
  });

  // Validate CSRF on state-changing requests
  app.use((req, res, next) => {
    if (CSRF_SAFE_METHODS.has(req.method)) return next();

    // Skip CSRF for exempt paths
    for (const exempt of CSRF_EXEMPT_PATHS) {
      if (req.path === exempt || req.path.startsWith(exempt)) return next();
    }

    // Skip for API key authenticated requests
    if (req.headers['x-api-key']) return next();

    const session = getSessionFromCookie(req);
    if (!session) return next(); // requireAuth will handle unauthenticated

    const cookieStr = req.headers.cookie || '';
    const sessionToken = cookieStr.match(/session=([^;]+)/)?.[1];
    const expectedCsrf = sessionToken ? _csrfTokens.get(sessionToken) : null;

    if (!expectedCsrf) return next(); // First request, no token yet

    const submittedCsrf = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!submittedCsrf || submittedCsrf !== expectedCsrf) {
      return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
    }
    next();
  });
}

export function clearCsrfToken(sessionToken) {
  _csrfTokens.delete(sessionToken);
}

// ========== WAF (Web Application Firewall) BASIC PATTERNS ==========
const WAF_PATTERNS = [
  // SQL injection patterns
  /(\bUNION\b\s+\bSELECT\b|\bDROP\b\s+\bTABLE\b|\bINSERT\b\s+\bINTO\b|\bDELETE\b\s+\bFROM\b|\bUPDATE\b\s+\bSET\b)/i,
  // Script injection
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus|blur)\s*=/i,
  // Path traversal
  /\.\.[/\\]/,
  // Null bytes
  /\x00/,
  // Command injection
  /[;&|`$]\s*(cat|ls|rm|wget|curl|nc|bash|sh|python|perl|ruby|php)\b/i,
];

function containsWafPattern(value) {
  if (typeof value !== 'string') return false;
  return WAF_PATTERNS.some(p => p.test(value));
}

function scanObject(obj, depth = 0) {
  if (depth > 5) return false;
  if (typeof obj === 'string') return containsWafPattern(obj);
  if (Array.isArray(obj)) return obj.some(v => scanObject(v, depth + 1));
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(v => scanObject(v, depth + 1));
  }
  return false;
}

const WAF_EXEMPT_PATHS = new Set([
  '/api/smartbot/knowledge', // May contain code examples
  '/api/smartbot/personality',
]);

export function setupWaf(app, addLog) {
  app.use((req, res, next) => {
    if (CSRF_SAFE_METHODS.has(req.method)) return next();
    if (WAF_EXEMPT_PATHS.has(req.path)) return next();

    // Scan query params
    if (req.query && scanObject(req.query)) {
      addLog('warn', `WAF blocked suspicious query params from ${req.ip}: ${req.path}`);
      return res.status(400).json({ success: false, error: 'Request blocked by security filter' });
    }
    // Scan body
    if (req.body && scanObject(req.body)) {
      addLog('warn', `WAF blocked suspicious request body from ${req.ip}: ${req.path}`);
      return res.status(400).json({ success: false, error: 'Request blocked by security filter' });
    }
    next();
  });
}

// ========== INPUT SANITIZATION ==========
const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
export function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, c => HTML_ENTITIES[c]);
}

// Strip control characters except newline/tab
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Strip null bytes and non-printable control chars (except \n \r \t)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Validate and constrain string input
export function validateStringInput(value, maxLength = 2000) {
  if (typeof value !== 'string') return '';
  return sanitizeString(value).slice(0, maxLength);
}

// ========== POST RATE LIMITER (global for all POST /api/*) ==========
const _postRateMap = new Map();

export function setupPostRateLimit(app) {
  app.use((req, res, next) => {
    if (req.method !== 'POST' || !req.path.startsWith('/api/')) return next();

    const key = (req.ip || 'anon') + ':POST';
    const now = Date.now();
    let entry = _postRateMap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 60000 }; // 60s window
      _postRateMap.set(key, entry);
    }
    entry.count++;

    // 60 POST requests per minute per IP across all /api/* endpoints
    if (entry.count > 60) {
      return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    }
    next();
  });

  // Cleanup every 5 min
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of _postRateMap) {
      if (now > entry.resetAt) _postRateMap.delete(key);
    }
  }, 300000);
}

// ========== UPLOAD RATE LIMIT ==========
const _uploadRateMap = new Map();

export function checkUploadRateLimit(ip) {
  const now = Date.now();
  let entry = _uploadRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 3600000 }; // 1h window
    _uploadRateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= 20; // 20 uploads per hour per IP
}

// Cleanup every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _uploadRateMap) {
    if (now > entry.resetAt) _uploadRateMap.delete(key);
  }
}, 1800000);

// ========== WEBSOCKET RATE LIMIT ==========
export function setupSocketRateLimit(io) {
  const _socketConnections = new Map(); // ip -> count

  io.use((socket, next) => {
    const ip = socket.handshake.address;
    const count = _socketConnections.get(ip) || 0;
    if (count >= 10) { // Max 10 concurrent connections per IP
      return next(new Error('Too many connections'));
    }
    _socketConnections.set(ip, count + 1);

    socket.on('disconnect', () => {
      const c = _socketConnections.get(ip) || 1;
      if (c <= 1) _socketConnections.delete(ip);
      else _socketConnections.set(ip, c - 1);
    });
    next();
  });
}

// ========== ACCOUNT LOCKOUT (per username) ==========
const _usernameLockouts = new Map(); // username -> { count, firstAttempt, lockedUntil }
const USERNAME_LOCKOUT_ATTEMPTS = 10;
const USERNAME_LOCKOUT_WINDOW = 30 * 60 * 1000; // 30 min
const USERNAME_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 min lockout

export function checkUsernameLockout(username) {
  if (!username) return true;
  const key = username.toLowerCase().trim();
  const record = _usernameLockouts.get(key);
  if (!record) return true;
  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) return false;
  if (record.lockedUntil && now >= record.lockedUntil) {
    _usernameLockouts.delete(key);
    return true;
  }
  if (now - record.firstAttempt > USERNAME_LOCKOUT_WINDOW) {
    _usernameLockouts.delete(key);
    return true;
  }
  return record.count < USERNAME_LOCKOUT_ATTEMPTS;
}

export function recordUsernameFailedLogin(username) {
  if (!username) return;
  const key = username.toLowerCase().trim();
  const now = Date.now();
  const record = _usernameLockouts.get(key) || { count: 0, firstAttempt: now, lockedUntil: null };
  record.count++;
  if (record.count >= USERNAME_LOCKOUT_ATTEMPTS) {
    record.lockedUntil = now + USERNAME_LOCKOUT_DURATION;
  }
  _usernameLockouts.set(key, record);
}

export function clearUsernameLockout(username) {
  if (!username) return;
  _usernameLockouts.delete(username.toLowerCase().trim());
}

// ========== MAGIC BYTES VALIDATION ==========
const IMAGE_SIGNATURES = [
  { ext: 'jpg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46] },
  { ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header (check WEBP at offset 8)
  { ext: 'bmp', bytes: [0x42, 0x4D] },
  { ext: 'ico', bytes: [0x00, 0x00, 0x01, 0x00] },
  { ext: 'svg', bytes: null }, // text-based, check separately
];

export function validateImageMagicBytes(filePath) {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    for (const sig of IMAGE_SIGNATURES) {
      if (!sig.bytes) continue;
      const match = sig.bytes.every((b, i) => buffer[i] === b);
      if (match) {
        // Extra check for WEBP: bytes 8-11 should be "WEBP"
        if (sig.ext === 'webp') {
          const webpTag = buffer.slice(8, 12).toString('ascii');
          if (webpTag !== 'WEBP') continue;
        }
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ========== FIELD ENCRYPTION (AES-256-GCM) ==========
const ENCRYPTION_ALGO = 'aes-256-gcm';

function deriveEncryptionKey() {
  // Derive a key from ENCRYPTION_SECRET env var (or DASHBOARD_PASSWORD as fallback)
  const secret = process.env.ENCRYPTION_SECRET || process.env.DASHBOARD_PASSWORD || '';
  if (!secret) return null;
  return crypto.scryptSync(secret, 'discord-bot-field-encryption', 32);
}

let _encryptionKey = null;
function getEncryptionKey() {
  if (!_encryptionKey) _encryptionKey = deriveEncryptionKey();
  return _encryptionKey;
}

export function encryptField(plaintext) {
  const key = getEncryptionKey();
  if (!key) return plaintext; // No key configured, store as-is
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptField(stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('enc:')) return stored;
  const key = getEncryptionKey();
  if (!key) return stored;
  try {
    const parts = stored.split(':');
    if (parts.length !== 4) return stored;
    const [, ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return stored; // If decryption fails, return as-is (possibly not encrypted)
  }
}

// ========== STRICT FILE PERMISSIONS ==========
export function writeSecureFile(filePath, data) {
  fs.writeFileSync(filePath, data, { mode: 0o600 });
}

// ========== RATE LIMIT HEADERS ==========
export function enhanceRateLimiter(originalRateLimiter) {
  return function(maxRequests = 60, windowMs = 60000) {
    const inner = originalRateLimiter(maxRequests, windowMs);
    return (req, res, next) => {
      // Wrap to add headers
      const origJson = res.json.bind(res);
      const key = req.ip || 'anon';
      
      inner(req, res, () => {
        // Add rate limit headers on successful pass-through
        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Window', String(Math.ceil(windowMs / 1000)));
        next();
      });
    };
  };
}

// ========== PATH TRAVERSAL PREVENTION ==========
export function safePath(basedir, userInput) {
  if (typeof userInput !== 'string') return null;
  const cleaned = userInput.replace(/[\\/]/g, '').replace(/\.\./g, '');
  if (!cleaned || cleaned !== userInput.replace(/[\\/]/g, '')) return null;
  const resolved = path.resolve(basedir, cleaned);
  if (!resolved.startsWith(path.resolve(basedir))) return null;
  return resolved;
}

// ========== SIGNUP RATE LIMIT ==========
const _signupRateMap = new Map(); // ip -> { count, resetAt }
const SIGNUP_MAX = 10;
const SIGNUP_WINDOW = 3600000; // 1 hour

export function checkSignupRateLimit(ip) {
  const now = Date.now();
  const entry = _signupRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    _signupRateMap.set(ip, { count: 1, resetAt: now + SIGNUP_WINDOW });
    return true;
  }
  if (entry.count >= SIGNUP_MAX) return false;
  entry.count++;
  return true;
}

// Cleanup every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _signupRateMap) {
    if (now > entry.resetAt) _signupRateMap.delete(key);
  }
}, 1800000);

// ========== DISCORD OAUTH STATE TOKENS ==========
const _oauthStates = new Map(); // state -> { createdAt, ip }
const OAUTH_STATE_TTL = 300000; // 5 minutes

export function generateOAuthState(ip) {
  const state = crypto.randomBytes(32).toString('hex');
  _oauthStates.set(state, { createdAt: Date.now(), ip });
  return state;
}

export function validateOAuthState(state, ip) {
  const entry = _oauthStates.get(state);
  if (!entry) return false;
  _oauthStates.delete(state);
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL) return false;
  if (entry.ip !== ip) return false;
  return true;
}

// Cleanup expired OAuth states every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _oauthStates) {
    if (now - entry.createdAt > OAUTH_STATE_TTL) _oauthStates.delete(key);
  }
}, 300000);
