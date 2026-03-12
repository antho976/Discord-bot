import { createCanvas, loadImage } from '@napi-rs/canvas';

const IMG_W = 900;
const IMG_H = 300;
const AVATAR_SIZE = 128;
const AVATAR_BORDER = 4;

/**
 * Generate a welcome or goodbye banner image.
 * Returns a Buffer (PNG) that can be attached to a Discord message.
 *
 * @param {Object} opts
 * @param {'welcome'|'goodbye'} opts.type
 * @param {string} opts.username
 * @param {string} opts.serverName
 * @param {string} opts.avatarUrl  – URL to the user avatar (png/webp)
 * @param {Object} opts.imageConfig – { backgroundUrl, textColor, font, overlayOpacity }
 * @returns {Promise<Buffer>}
 */
export async function generateBannerImage({
  type = 'welcome',
  username,
  serverName,
  avatarUrl,
  imageConfig = {}
}) {
  const {
    backgroundUrl,
    textColor = type === 'welcome' ? '#ffffff' : '#ff6b6b',
    overlayOpacity = type === 'welcome' ? 0.4 : 0.5
  } = imageConfig;

  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx = canvas.getContext('2d');

  // ── Background ──
  let bgLoaded = false;
  if (backgroundUrl) {
    try {
      const res = await fetch(backgroundUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const bg = await loadImage(buf);
        // Cover-fill: scale to cover entire canvas
        const scale = Math.max(IMG_W / bg.width, IMG_H / bg.height);
        const sw = bg.width * scale;
        const sh = bg.height * scale;
        ctx.drawImage(bg, (IMG_W - sw) / 2, (IMG_H - sh) / 2, sw, sh);
        bgLoaded = true;
      }
    } catch { /* fall through to gradient */ }
  }

  if (!bgLoaded) {
    // Default gradient background
    const grad = ctx.createLinearGradient(0, 0, IMG_W, IMG_H);
    if (type === 'welcome') {
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(0.5, '#16213e');
      grad.addColorStop(1, '#0f3460');
    } else {
      grad.addColorStop(0, '#2d1b2e');
      grad.addColorStop(0.5, '#1a1025');
      grad.addColorStop(1, '#0d0a1a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, IMG_W, IMG_H);
  }

  // ── Dark overlay ──
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, Math.max(0, overlayOpacity))})`;
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  // ── Decorative subtle border ──
  ctx.strokeStyle = textColor;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, IMG_W - 32, IMG_H - 32);
  ctx.globalAlpha = 1;

  // ── Avatar ──
  const avatarX = IMG_W / 2;
  const avatarY = 95;
  const radius = AVATAR_SIZE / 2;

  let avatarLoaded = false;
  if (avatarUrl) {
    try {
      const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const avatar = await loadImage(buf);

        // White circle border
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, radius + AVATAR_BORDER, 0, Math.PI * 2);
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Clip circle and draw avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, avatarX - radius, avatarY - radius, AVATAR_SIZE, AVATAR_SIZE);
        ctx.restore();
        avatarLoaded = true;
      }
    } catch { /* skip avatar */ }
  }

  if (!avatarLoaded) {
    // Placeholder circle with initial
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username || '?')[0].toUpperCase(), avatarX, avatarY);
  }

  // ── Text below avatar ──
  const textY = avatarY + radius + 35;

  // Title line: "Welcome!" / "Goodbye!"
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px sans-serif';
  const title = type === 'welcome' ? 'Welcome!' : 'Goodbye!';
  ctx.fillText(title, avatarX, textY);

  // Username
  ctx.font = 'bold 22px sans-serif';
  const displayName = username.length > 28 ? username.slice(0, 25) + '...' : username;
  ctx.fillText(displayName, avatarX, textY + 32);

  // Server name (smaller, dimmer)
  ctx.globalAlpha = 0.7;
  ctx.font = '16px sans-serif';
  const serverLine = type === 'welcome'
    ? `to ${serverName}`
    : `has left ${serverName}`;
  ctx.fillText(serverLine, avatarX, textY + 58);
  ctx.globalAlpha = 1;

  return canvas.toBuffer('image/png');
}
