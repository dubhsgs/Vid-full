import { useEffect, useRef, useState } from 'react';
import { CERTIFICATE_CANVAS_HEIGHT, CERTIFICATE_CANVAS_WIDTH, renderCertificateCanvas } from '../utils/certificateCanvas';

interface RenderPayload {
  characterName: string;
  createdAt: string;
  recordId: string;
  avatarUrl: string;
}

declare global {
  interface Window {
    __VAID_CARD_RENDERER_READY__?: boolean;
    __VAID_CARD_RENDERER_ERROR__?: string;
    __VAID_CARD_RENDERER_STAGE__?: string;
  }
}

function decodeRenderPayload(): RenderPayload | null {
  const encoded = window.location.hash.replace(/^#/, '');
  if (!encoded) return null;

  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = decodeURIComponent(atob(padded));
    const payload = JSON.parse(json) as Partial<RenderPayload>;

    const characterName = payload.characterName ?? (payload as { character_name?: unknown }).character_name;
    const createdAt = payload.createdAt ?? (payload as { created_at?: unknown }).created_at;
    const recordId = payload.recordId ?? (payload as { friendly_id?: unknown }).friendly_id;
    const avatarUrl = payload.avatarUrl ?? (payload as { image_url?: unknown }).image_url;

    if (!characterName || !createdAt || !recordId || !avatarUrl) {
      return null;
    }

    return {
      characterName: String(characterName),
      createdAt: String(createdAt),
      recordId: String(recordId).toUpperCase(),
      avatarUrl: String(avatarUrl),
    };
  } catch (error) {
    console.error('[CardRendererPage] Invalid payload:', error);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = window.setTimeout(() => {
      reject(new Error(`Image load timed out: ${src}`));
    }, 8000);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error(`Image load failed: ${src}`));
    };
    img.src = src;
  });
}

function formatIssuedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(date.getDate()).padStart(2, '0');
  return `${month} ${day}, ${date.getFullYear()}`;
}

export function CardRendererPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.__VAID_CARD_RENDERER_READY__ = false;
    window.__VAID_CARD_RENDERER_ERROR__ = undefined;
    window.__VAID_CARD_RENDERER_STAGE__ = 'start';

    const render = async () => {
      const payload = decodeRenderPayload();
      const canvas = canvasRef.current;
      if (!payload || !canvas) {
        throw new Error('INVALID_RENDER_PAYLOAD');
      }

      window.__VAID_CARD_RENDERER_STAGE__ = 'load-assets';
      const [backgroundImage, logoImage, textureImage, avatarImage] = await Promise.all([
        loadImage('/bg.jpg'),
        loadImage('/vaid_logo_mark.png'),
        loadImage('/grid_texture.png'),
        loadImage(payload.avatarUrl),
      ]);

      window.__VAID_CARD_RENDERER_STAGE__ = 'qr';
      const { default: QRCode } = await import('qrcode');
      const verifyUrl = `${window.location.origin}/verify/${payload.recordId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#f18ab5', light: '#00000000' },
        errorCorrectionLevel: 'M',
      });
      const qrImage = await loadImage(qrDataUrl);

      window.__VAID_CARD_RENDERER_STAGE__ = 'draw';
      const rendered = await renderCertificateCanvas(canvas, {
        fields: {
          name: payload.characterName,
          status: 'VERIFIED',
          issuedDate: formatIssuedDate(payload.createdAt),
          serialId: payload.recordId,
          description: 'THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.',
        },
        assets: {
          backgroundImage,
          logoImage,
          textureImage,
          avatarImage,
          qrImage,
        },
        copy: {
          nameLabel: 'NAME:',
          statusLabel: 'STATUS:',
          createdLabel: 'CREATED:',
          recordIdLabel: 'RECORD ID:',
          proofLabel: 'PROOF:',
          proofValue: 'Blockchain sealed',
        },
      }, { dpr: 2, requireFonts: true });

      if (!rendered) {
        throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
      }

      window.__VAID_CARD_RENDERER_READY__ = true;
      window.__VAID_CARD_RENDERER_STAGE__ = 'ready';
    };

    render().catch((renderError) => {
      const message = renderError instanceof Error ? renderError.message : 'CARD_RENDER_FAILED';
      window.__VAID_CARD_RENDERER_ERROR__ = message;
      window.__VAID_CARD_RENDERER_STAGE__ = 'error';
      setError(message);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#030713] p-0">
      {error ? <div className="p-4 text-red-400">{error}</div> : null}
      <canvas
        ref={canvasRef}
        width={CERTIFICATE_CANVAS_WIDTH * 2}
        height={CERTIFICATE_CANVAS_HEIGHT * 2}
        style={{
          display: 'block',
          width: `${CERTIFICATE_CANVAS_WIDTH}px`,
          height: `${CERTIFICATE_CANVAS_HEIGHT}px`,
        }}
      />
    </main>
  );
}
