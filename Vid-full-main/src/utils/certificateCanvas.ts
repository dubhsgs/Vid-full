export const CERTIFICATE_CANVAS_WIDTH = 1024;
export const CERTIFICATE_CANVAS_HEIGHT = 576;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';
const PANEL_W = 880;
const PANEL_H = 494;
const PANEL_X = (CERTIFICATE_CANVAS_WIDTH - PANEL_W) / 2;
const PANEL_Y = (CERTIFICATE_CANVAS_HEIGHT - PANEL_H) / 2;
const PANEL_RADIUS = 32;

const AVATAR_CENTER_X_RATIO = 0.2112;
const AVATAR_CENTER_Y_RATIO = 0.5236;
const AVATAR_DIAMETER_RATIO = 0.298;
const AVATAR_IMAGE_RATIO = 0.79;
const AVATAR_COVER_SCALE = 1.14;
const DIVIDER_X_RATIO = 0.4176;
const DIVIDER_LENGTH_SCALE = 0.828;
const DIVIDER_TOP_SCALE = 0.95;
const TEXT_START_X_RATIO = 0.4592;
const TEXT_NAME_Y_RATIO = 0.3776;
const TEXT_STATUS_Y_RATIO = 0.4808;
const TEXT_ISSUED_Y_RATIO = 0.5885;
const TEXT_ID_Y_RATIO = 0.6947;
const QR_PLATE_X_RATIO = 0.836;
const QR_PLATE_W_RATIO = 0.112;
const QR_PLATE_H_RATIO = 0.247;
const QR_MODULE_INSET_X_RATIO = 0.126;
const QR_MODULE_INSET_Y_RATIO = 0.0956;
const QR_MODULE_SIZE_IN_PLATE_RATIO = 0.748;
const QR_PROOF_LABEL_Y_RATIO = 0.78;
const QR_PROOF_VALUE_Y_RATIO = 0.895;
const INFO_TEXT_FONT_SIZE = 22;
const QR_TEXT_PRIMARY_SIZE = 9.4;
const QR_TEXT_SECONDARY_SIZE = 9.4;
const DESCRIPTION_TEXT_SIZE = 13.2;

export interface CertificateCanvasFields {
  name: string;
  status: string;
  issuedDate: string;
  serialId: string;
  description: string;
}

export interface CertificateCanvasAssets {
  backgroundImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
  textureImage: HTMLImageElement | null;
  avatarImage: HTMLImageElement | null;
  qrImage: HTMLImageElement | null;
}

export interface CertificateCanvasRenderInput {
  fields: CertificateCanvasFields;
  assets: CertificateCanvasAssets;
  copy?: CertificateCanvasCopy;
}

export interface CertificateCanvasCopy {
  nameLabel: string;
  statusLabel: string;
  createdLabel: string;
  recordIdLabel: string;
  proofLabel: string;
  proofValue: string;
}

export interface CertificateCanvasRenderOptions {
  dpr?: number;
}

export function formatCertificateIssuedDate(date = new Date(), language = 'en') {
  if (language.startsWith('zh')) {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  if (language.startsWith('ja')) {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function getCanvasDpr(dpr?: number) {
  const fallback = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
  const value = dpr ?? fallback;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function waitForFontsReady() {
  if (typeof document === 'undefined' || !document.fonts?.ready) return;

  try {
    await document.fonts.ready;
  } catch {
    // If the browser cannot report font readiness, draw with the available fonts.
  }
}

function hexToRgba(hex: string, alpha = 1) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx;
  let sy;
  let sw;
  let sh;

  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getAvatarGeometry() {
  const outerDiameter = PANEL_W * AVATAR_DIAMETER_RATIO;
  const cx = PANEL_X + PANEL_W * AVATAR_CENTER_X_RATIO;
  const cy = PANEL_Y + PANEL_H * AVATAR_CENTER_Y_RATIO;
  const ringR = outerDiameter / 2;
  const haloR = ringR * 1.24;
  const imageR = ringR * AVATAR_IMAGE_RATIO;

  return { cx, cy, ringR, haloR, imageR };
}

function getDividerGeometry() {
  const { cy, ringR } = getAvatarGeometry();
  const dividerHalfLength = ringR * DIVIDER_LENGTH_SCALE;
  const dividerTopHalfLength = dividerHalfLength * DIVIDER_TOP_SCALE;

  return {
    lx: PANEL_X + PANEL_W * DIVIDER_X_RATIO,
    ly1: cy - dividerTopHalfLength,
    ly2: cy + dividerHalfLength,
  };
}

function getQRCodeGeometry() {
  const plateX = PANEL_X + PANEL_W * QR_PLATE_X_RATIO;
  const plateW = PANEL_W * QR_PLATE_W_RATIO;
  const plateH = PANEL_H * QR_PLATE_H_RATIO;
  const { ly2 } = getDividerGeometry();
  const plateY = ly2 - plateH;
  const qs = plateW * QR_MODULE_SIZE_IN_PLATE_RATIO;

  return {
    plateX,
    plateY,
    plateW,
    plateH,
    qx: plateX + plateW * QR_MODULE_INSET_X_RATIO,
    qy: plateY + plateH * QR_MODULE_INSET_Y_RATIO,
    qs,
  };
}

function drawPanel(ctx: CanvasRenderingContext2D, bgImg: HTMLImageElement | null) {
  if (bgImg) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.clip();
    ctx.filter = 'blur(6px) brightness(1.15) saturate(1.06)';
    drawCover(ctx, bgImg, 0, 0, CERTIFICATE_CANVAS_WIDTH, CERTIFICATE_CANVAS_HEIGHT);
    ctx.filter = 'none';
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.fillStyle = 'rgba(10, 14, 22, 0.12)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.clip();
  const cornerGlows = [
    { x: PANEL_X + 8, y: PANEL_Y + 8 },
    { x: PANEL_X + PANEL_W - 8, y: PANEL_Y + 8 },
    { x: PANEL_X + 8, y: PANEL_Y + PANEL_H - 8 },
    { x: PANEL_X + PANEL_W - 8, y: PANEL_Y + PANEL_H - 8 },
  ];
  cornerGlows.forEach(({ x, y }) => {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 128);
    glow.addColorStop(0, 'rgba(210, 230, 255, 0.14)');
    glow.addColorStop(0.22, 'rgba(210, 230, 255, 0.08)');
    glow.addColorStop(0.5, 'rgba(170, 205, 255, 0.04)');
    glow.addColorStop(1, 'rgba(170, 205, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 128, y - 128, 256, 256);
  });
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.strokeStyle = 'rgba(225, 235, 255, 0.42)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(140, 180, 255, 0.18)';
  ctx.shadowBlur = 32;
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.strokeStyle = 'rgba(140, 180, 255, 0.14)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.restore();
}

function drawTechTexture(ctx: CanvasRenderingContext2D, textureImg: HTMLImageElement | null) {
  if (!textureImg) return;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.clip();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.18;
  ctx.filter = 'contrast(1.35) brightness(1.08)';
  const textureScale = 1.5;
  const scaledW = PANEL_W * textureScale;
  const scaledH = PANEL_H * textureScale;
  const scaledX = PANEL_X - (scaledW - PANEL_W) / 2;
  const scaledY = PANEL_Y - (scaledH - PANEL_H) / 2;
  drawCover(ctx, textureImg, scaledX, scaledY, scaledW, scaledH);
  ctx.filter = 'none';
  ctx.restore();
}

function drawCardMistBlur(ctx: CanvasRenderingContext2D) {
  const { cx, cy, imageR } = getAvatarGeometry();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
  ctx.moveTo(cx + imageR * 1.08, cy);
  ctx.arc(cx, cy, imageR * 1.08, 0, Math.PI * 2);
  ctx.clip('evenodd');
  ctx.filter = 'blur(20px)';
  ctx.globalCompositeOperation = 'screen';

  const mistBand = ctx.createLinearGradient(
    PANEL_X,
    PANEL_Y + PANEL_H * 0.22,
    PANEL_X + PANEL_W,
    PANEL_Y + PANEL_H * 0.92
  );
  mistBand.addColorStop(0, 'rgba(255, 228, 150, 0.0525)');
  mistBand.addColorStop(0.28, 'rgba(255, 221, 132, 0.0385)');
  mistBand.addColorStop(0.62, 'rgba(255, 214, 112, 0.025)');
  mistBand.addColorStop(1, 'rgba(255, 208, 98, 0.0175)');
  ctx.fillStyle = mistBand;
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  const centerMist = ctx.createRadialGradient(
    PANEL_X + PANEL_W * 0.2,
    PANEL_Y + PANEL_H * 0.38,
    PANEL_W * 0.03,
    PANEL_X + PANEL_W * 0.2,
    PANEL_Y + PANEL_H * 0.38,
    PANEL_W * 0.64
  );
  centerMist.addColorStop(0, 'rgba(255, 232, 166, 0.0203)');
  centerMist.addColorStop(0.55, 'rgba(255, 220, 128, 0.0077)');
  centerMist.addColorStop(1, 'rgba(255, 208, 98, 0.0021)');
  ctx.fillStyle = centerMist;
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  const topLeftBoost = ctx.createRadialGradient(
    PANEL_X + PANEL_W * 0.08,
    PANEL_Y + PANEL_H * 0.12,
    PANEL_W * 0.02,
    PANEL_X + PANEL_W * 0.08,
    PANEL_Y + PANEL_H * 0.12,
    PANEL_W * 0.36
  );
  topLeftBoost.addColorStop(0, 'rgba(255, 234, 170, 0.065)');
  topLeftBoost.addColorStop(0.5, 'rgba(255, 222, 138, 0.0275)');
  topLeftBoost.addColorStop(1, 'rgba(255, 208, 98, 0)');
  ctx.fillStyle = topLeftBoost;
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  const rightBottomLift = ctx.createRadialGradient(
    PANEL_X + PANEL_W * 0.9,
    PANEL_Y + PANEL_H * 0.88,
    PANEL_W * 0.03,
    PANEL_X + PANEL_W * 0.9,
    PANEL_Y + PANEL_H * 0.88,
    PANEL_W * 0.4
  );
  rightBottomLift.addColorStop(0, 'rgba(255, 226, 146, 0.0553)');
  rightBottomLift.addColorStop(0.6, 'rgba(255, 214, 112, 0.0228)');
  rightBottomLift.addColorStop(1, 'rgba(255, 208, 98, 0)');
  ctx.fillStyle = rightBottomLift;
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  ctx.filter = 'none';
  ctx.restore();
}

function drawLogo(ctx: CanvasRenderingContext2D, logoImg: HTMLImageElement | null) {
  if (!logoImg) return;

  const sourceX = 220;
  const sourceY = 560;
  const sourceW = 1610;
  const sourceH = 840;
  const processedW = 520;
  const processedH = 250;
  const offscreen = document.createElement('canvas');
  offscreen.width = processedW;
  offscreen.height = processedH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.drawImage(logoImg, sourceX, sourceY, sourceW, sourceH, 0, 0, processedW, processedH);
  const imageData = offCtx.getImageData(0, 0, processedW, processedH);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (luminance < 150) {
      data[i + 3] = 0;
      continue;
    }

    const alpha = Math.min(255, Math.max(0, (luminance - 140) * 2.2));
    data[i] = 248;
    data[i + 1] = 241;
    data[i + 2] = 214;
    data[i + 3] = alpha;
  }

  offCtx.clearRect(0, 0, processedW, processedH);
  offCtx.putImageData(imageData, 0, 0);

  const logoW = 211;
  const logoH = 102;
  const lx = (CERTIFICATE_CANVAS_WIDTH - logoW) / 2;
  const ly = 58;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.drawImage(offscreen, lx, ly, logoW, logoH);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(120, 232, 248, 0.72)';
  ctx.shadowBlur = 24;
  ctx.drawImage(offscreen, lx, ly, logoW, logoH);
  ctx.globalAlpha = 0.94;
  ctx.shadowColor = 'rgba(228, 116, 204, 0.62)';
  ctx.shadowBlur = 14;
  ctx.drawImage(offscreen, lx, ly, logoW, logoH);
  ctx.restore();
}

function drawAvatar(ctx: CanvasRenderingContext2D, avatarImg: HTMLImageElement | null) {
  const { cx, cy, ringR, haloR, imageR } = getAvatarGeometry();
  ctx.save();

  const ambientGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
  ambientGlow.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  ambientGlow.addColorStop(0.18, 'rgba(200, 255, 245, 0.10)');
  ambientGlow.addColorStop(0.52, hexToRgba(AVATAR_COLOR_START, 0.12));
  ambientGlow.addColorStop(0.78, hexToRgba(AVATAR_COLOR_END, 0.11));
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, ringR * 1.09, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 28, 34, 0.16)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  const conicCapableContext = ctx as CanvasRenderingContext2D & {
    createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient;
  };
  let outerRingStroke: CanvasGradient;
  if (typeof conicCapableContext.createConicGradient === 'function') {
    const gradient = conicCapableContext.createConicGradient(-Math.PI / 2, cx, cy);
    gradient.addColorStop(0, '#32d7d2');
    gradient.addColorStop(0.47, '#32d7d2');
    gradient.addColorStop(0.5, '#e040a0');
    gradient.addColorStop(0.97, '#e040a0');
    gradient.addColorStop(1, '#32d7d2');
    outerRingStroke = gradient;
  } else {
    const gradient = ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
    gradient.addColorStop(0, '#32d7d2');
    gradient.addColorStop(1, '#e040a0');
    outerRingStroke = gradient;
  }

  ctx.strokeStyle = outerRingStroke;
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(80, 200, 220, 0.20)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = outerRingStroke;
  ctx.lineWidth = 7;
  ctx.shadowColor = 'rgba(138, 214, 255, 0.55)';
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(230, 140, 220, 0.48)';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;

  const outerOrbits = [
    { r: ringR * 1.06, a1: Math.PI * 0.12, a2: Math.PI * 0.42, w: 1.2, c: 'rgba(150, 232, 248, 0.30)' },
    { r: ringR * 1.08, a1: Math.PI * 0.78, a2: Math.PI * 1.06, w: 1.1, c: 'rgba(216, 136, 214, 0.28)' },
    { r: ringR * 1.05, a1: Math.PI * 1.36, a2: Math.PI * 1.70, w: 1.2, c: 'rgba(146, 226, 244, 0.26)' },
    { r: ringR * 1.07, a1: Math.PI * 1.92, a2: Math.PI * 2.20, w: 1, c: 'rgba(224, 146, 220, 0.24)' },
  ];
  outerOrbits.forEach((arc) => {
    ctx.beginPath();
    ctx.arc(cx, cy, arc.r, arc.a1, arc.a2);
    ctx.strokeStyle = arc.c;
    ctx.lineWidth = arc.w;
    ctx.shadowColor = arc.c.replace(/0\.\d+\)/, '0.36)');
    ctx.shadowBlur = 6;
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  for (let i = 0; i < 13; i++) {
    const seed = i * 1.371 + 0.618;
    const t = (Math.sin(seed * 12.9898) + 1) * 0.5;
    const t2 = (Math.sin(seed * 7.233 + 2.41) + 1) * 0.5;
    const t3 = (Math.sin(seed * 5.921 + 1.17) + 1) * 0.5;
    const radius = ringR * (0.84 + t * 0.14);
    const start = t2 * Math.PI * 2;
    const span = (0.12 + t3 * 0.22) * Math.PI;
    const isCool = i % 2 === 0;
    const color = isCool
      ? `rgba(168, 236, 255, ${0.3 + t * 0.24})`
      : `rgba(182, 154, 255, ${0.28 + t * 0.24})`;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + span);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3 + t * 1.6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 + t * 5;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const innerGlass = ctx.createRadialGradient(cx, cy - 18, 12, cx, cy, imageR + 24);
  innerGlass.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  innerGlass.addColorStop(0.32, 'rgba(44, 62, 78, 0.26)');
  innerGlass.addColorStop(0.72, 'rgba(18, 22, 32, 0.72)');
  innerGlass.addColorStop(1, 'rgba(10, 12, 18, 0.92)');
  ctx.beginPath();
  ctx.arc(cx, cy, imageR * 1.07, 0, Math.PI * 2);
  ctx.fillStyle = innerGlass;
  ctx.fill();

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, imageR, 0, Math.PI * 2);
    ctx.clip();
    const minSide = Math.min(avatarImg.width, avatarImg.height);
    const sx = (avatarImg.width - minSide) / 2;
    const sy = (avatarImg.height - minSide) / 2;
    const targetSize = imageR * 2 * AVATAR_COVER_SCALE;
    const dx = cx - targetSize / 2;
    const dy = cy - targetSize / 2;
    ctx.filter = 'saturate(1.02) brightness(0.98) contrast(1.02)';
    ctx.globalAlpha = 0.95;
    ctx.drawImage(avatarImg, sx, sy, minSide, minSide, dx, dy, targetSize, targetSize);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    const colorWash = ctx.createLinearGradient(cx - imageR, cy - imageR, cx + imageR, cy + imageR);
    colorWash.addColorStop(0, 'rgba(210, 255, 245, 0.08)');
    colorWash.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    colorWash.addColorStop(1, hexToRgba(AVATAR_COLOR_END, 0.08));
    ctx.fillStyle = colorWash;
    ctx.fillRect(cx - imageR, cy - imageR, imageR * 2, imageR * 2);

    const vignette = ctx.createRadialGradient(cx, cy, imageR * 0.35, cx, cy, imageR);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.72, 'rgba(5, 8, 16, 0.08)');
    vignette.addColorStop(1, 'rgba(5, 8, 16, 0.22)');
    ctx.fillStyle = vignette;
    ctx.fillRect(cx - imageR, cy - imageR, imageR * 2, imageR * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(100, 120, 160, 0.3)';
    ctx.font = '34px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', cx, cy);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, imageR + 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawDividerLine(ctx: CanvasRenderingContext2D) {
  const { lx, ly1, ly2 } = getDividerGeometry();
  ctx.save();
  const glow = ctx.createLinearGradient(lx - 8, ly1, lx + 8, ly1);
  glow.addColorStop(0, 'rgba(180, 237, 222, 0)');
  glow.addColorStop(0.5, 'rgba(180, 237, 222, 0.16)');
  glow.addColorStop(1, 'rgba(180, 237, 222, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lx - 8, ly1, 16, ly2 - ly1);

  const core = ctx.createLinearGradient(lx - 1.5, ly1, lx + 1.5, ly1);
  core.addColorStop(0.5, 'rgba(215, 244, 235, 0.62)');
  ctx.fillStyle = core;
  ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(122, 238, 230, 0.34)';
  ctx.shadowColor = 'rgba(122, 238, 230, 0.58)';
  ctx.shadowBlur = 12;
  ctx.fillRect(lx - 1, ly1, 2, ly2 - ly1);
  ctx.fillStyle = 'rgba(230, 132, 206, 0.22)';
  ctx.shadowColor = 'rgba(230, 132, 206, 0.44)';
  ctx.shadowBlur = 8;
  ctx.fillRect(lx - 0.8, ly1, 1.6, ly2 - ly1);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawTextFields(
  ctx: CanvasRenderingContext2D,
  fields: CertificateCanvasFields,
  copy: CertificateCanvasCopy
) {
  const startX = PANEL_X + PANEL_W * TEXT_START_X_RATIO;
  const labelStyle = 'rgba(205, 198, 183, 0.84)';
  const valueStyle = 'rgba(247, 241, 229, 0.98)';
  const sharedFont = `600 ${INFO_TEXT_FONT_SIZE}px "Avenir Next", "Segoe UI", system-ui`;
  const labelGap = 11;
  const lines = [
    { label: copy.nameLabel, value: fields.name, y: PANEL_Y + PANEL_H * TEXT_NAME_Y_RATIO, valueColor: valueStyle },
    { label: copy.statusLabel, value: fields.status, y: PANEL_Y + PANEL_H * TEXT_STATUS_Y_RATIO, valueColor: '#1fe06b', isStatus: true },
    { label: copy.createdLabel, value: fields.issuedDate, y: PANEL_Y + PANEL_H * TEXT_ISSUED_Y_RATIO, valueColor: valueStyle },
    { label: copy.recordIdLabel, value: fields.serialId, y: PANEL_Y + PANEL_H * TEXT_ID_Y_RATIO, valueColor: valueStyle },
  ];

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line) => {
    ctx.font = sharedFont;
    ctx.fillStyle = labelStyle;
    ctx.fillText(line.label, startX, line.y);
    const valueX = startX + ctx.measureText(line.label).width + labelGap;

    if (line.isStatus) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(31, 224, 107, 0.63)';
      ctx.shadowBlur = 36;
      ctx.shadowColor = 'rgba(31, 224, 107, 0.95)';
      ctx.fillText(line.value, valueX, line.y);
      ctx.restore();
      ctx.fillStyle = line.valueColor;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(31, 224, 107, 0.95)';
    } else {
      ctx.fillStyle = line.valueColor;
      ctx.shadowBlur = 0;
    }

    ctx.fillText(line.value, valueX, line.y);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function drawQRCode(
  ctx: CanvasRenderingContext2D,
  qrImg: HTMLImageElement | null,
  copy: CertificateCanvasCopy
) {
  const { plateX, plateY, plateW, plateH, qx, qy, qs } = getQRCodeGeometry();
  const textCenterX = plateX + plateW / 2;
  const textSafeWidth = plateW - 12;
  const proofLabelY = plateY + plateH * QR_PROOF_LABEL_Y_RATIO;
  const proofValueY = plateY + plateH * QR_PROOF_VALUE_Y_RATIO;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, plateX, plateY, plateW, plateH, 8);
  const plateGradient = ctx.createLinearGradient(plateX, plateY, plateX + plateW, plateY + plateH);
  plateGradient.addColorStop(0, 'rgba(114, 99, 70, 0.48)');
  plateGradient.addColorStop(0.58, 'rgba(90, 82, 58, 0.38)');
  plateGradient.addColorStop(1, 'rgba(129, 115, 86, 0.42)');
  ctx.fillStyle = plateGradient;
  ctx.shadowColor = 'rgba(244, 147, 193, 0.22)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(233, 206, 163, 0.26)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (qrImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(qx, qy, qs, qs);
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = 'rgba(248, 152, 205, 0.34)';
    ctx.shadowBlur = 7;
    ctx.drawImage(qrImg, qx, qy, qs, qs);
    ctx.shadowColor = 'rgba(120, 228, 246, 0.21)';
    ctx.shadowBlur = 4;
    ctx.drawImage(qrImg, qx, qy, qs, qs);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(qrImg, qx, qy, qs, qs);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${QR_TEXT_PRIMARY_SIZE}px "Avenir Next", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = 'rgba(170, 170, 158, 0.82)';
  ctx.fillText(copy.proofLabel, textCenterX, proofLabelY, textSafeWidth);
  ctx.font = `700 ${QR_TEXT_SECONDARY_SIZE}px "Avenir Next", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = 'rgba(170, 170, 158, 0.82)';
  ctx.fillText(copy.proofValue, textCenterX, proofValueY, textSafeWidth);
  ctx.restore();
}

function drawDescription(ctx: CanvasRenderingContext2D, description: string) {
  ctx.save();
  ctx.font = `500 ${DESCRIPTION_TEXT_SIZE}px "Segoe UI", system-ui`;
  ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(description, CERTIFICATE_CANVAS_WIDTH / 2, 514);
  ctx.restore();
}

export async function renderCertificateCanvas(
  canvas: HTMLCanvasElement,
  input: CertificateCanvasRenderInput,
  options: CertificateCanvasRenderOptions = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  await waitForFontsReady();

  const dpr = getCanvasDpr(options.dpr);
  canvas.width = CERTIFICATE_CANVAS_WIDTH * dpr;
  canvas.height = CERTIFICATE_CANVAS_HEIGHT * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, CERTIFICATE_CANVAS_WIDTH, CERTIFICATE_CANVAS_HEIGHT);

  const { assets, fields } = input;
  const copy = input.copy ?? {
    nameLabel: 'NAME:',
    statusLabel: 'STATUS:',
    createdLabel: 'CREATED:',
    recordIdLabel: 'RECORD ID:',
    proofLabel: 'PROOF:',
    proofValue: 'Blockchain sealed',
  };
  if (assets.backgroundImage) {
    drawCover(ctx, assets.backgroundImage, 0, 0, CERTIFICATE_CANVAS_WIDTH, CERTIFICATE_CANVAS_HEIGHT);
  }
  drawPanel(ctx, assets.backgroundImage);
  drawTechTexture(ctx, assets.textureImage);
  drawLogo(ctx, assets.logoImage);
  drawAvatar(ctx, assets.avatarImage);
  drawDividerLine(ctx);
  drawTextFields(ctx, fields, copy);
  drawQRCode(ctx, assets.qrImage, copy);
  drawDescription(ctx, fields.description);
  drawCardMistBlur(ctx);

  return true;
}
