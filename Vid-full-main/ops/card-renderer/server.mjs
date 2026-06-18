import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const PORT = Number(process.env.PORT || 8787);
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'https://vaid.top').replace(/\/+$/, '');
const RENDER_SECRET = requiredEnv('VAID_CARD_RENDERER_SECRET');
const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium-headless';
const RENDER_VERSION = process.env.VAID_CARD_RENDER_VERSION || 'chrome-canvas-v1';

function requiredEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function encodePayload(payload) {
  return Buffer.from(encodeURIComponent(JSON.stringify(payload)), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function requireString(value, name) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

async function renderCardImages(payload) {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1024, height: 576, deviceScaleFactor: 1 },
      deviceScaleFactor: 1,
    });

    const encodedPayload = encodePayload(payload);
    await page.goto(`${FRONTEND_ORIGIN}/card-renderer#${encodedPayload}`, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });

    await page.waitForFunction(() => (
      window.__VAID_CARD_RENDERER_READY__ === true || Boolean(window.__VAID_CARD_RENDERER_ERROR__)
    ), { timeout: 45000 });

    const renderError = await page.evaluate(() => window.__VAID_CARD_RENDERER_ERROR__ || null);
    if (renderError) {
      throw new Error(renderError);
    }

    const images = await page.locator('canvas').evaluate((canvas) => {
      const pngDataUrl = canvas.toDataURL('image/png');
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 1024;
      previewCanvas.height = 576;
      const previewContext = previewCanvas.getContext('2d');
      if (!previewContext) {
        throw new Error('CARD_PREVIEW_CONTEXT_UNAVAILABLE');
      }
      previewContext.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      const webpDataUrl = previewCanvas.toDataURL('image/webp', 0.88);

      return {
        pngBase64: pngDataUrl.split(',')[1] || '',
        previewBase64: webpDataUrl.split(',')[1] || '',
        previewMimeType: webpDataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/png',
      };
    });

    if (!images.pngBase64) throw new Error('CARD_IMAGE_EXPORT_FAILED');
    if (!images.previewBase64) throw new Error('CARD_PREVIEW_EXPORT_FAILED');

    return {
      png: Buffer.from(images.pngBase64, 'base64'),
      preview: Buffer.from(images.previewBase64, 'base64'),
      previewMimeType: images.previewMimeType,
    };
  } finally {
    await browser.close();
  }
}

async function render(body) {
  const payload = {
    characterName: requireString(body.character_name, 'character_name'),
    createdAt: requireString(body.created_at, 'created_at'),
    recordId: requireString(body.friendly_id, 'friendly_id').toUpperCase(),
    avatarUrl: requireString(body.image_url, 'image_url'),
  };

  const images = await renderCardImages(payload);
  return {
    friendly_id: payload.recordId,
    image_base64: images.png.toString('base64'),
    image_sha256: createHash('sha256').update(images.png).digest('hex'),
    preview_image_base64: images.preview.toString('base64'),
    preview_image_sha256: createHash('sha256').update(images.preview).digest('hex'),
    preview_image_mime_type: images.previewMimeType,
    render_version: RENDER_VERSION,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method !== 'POST' || req.url !== '/render-card') {
      return json(res, 404, { success: false, error: 'NOT_FOUND' });
    }

    const providedSecret = String(req.headers['x-vaid-card-renderer-secret'] || '').trim();
    if (providedSecret !== RENDER_SECRET) {
      return json(res, 401, { success: false, error: 'UNAUTHORIZED' });
    }

    const body = await readJson(req);
    const result = await render(body);
    return json(res, 200, { success: true, ...result });
  } catch (error) {
    console.error('[card-renderer]', error);
    return json(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'CARD_RENDER_FAILED',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[card-renderer] listening on 127.0.0.1:${PORT}`);
});
