import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { supabase } from '../utils/supabase';
import { calculateSHA256 } from '../utils/sha256';
import { uploadImageToStorage } from '../utils/imageUpload';
import { consumeGenerationReady } from '../utils/licenseManager';

// --- 高清渲染基准 ---
const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
const REAL_W = CANVAS_W * DPR;
const REAL_H = CANVAS_H * DPR;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';
const PANEL_W = 880;
const PANEL_H = 494;
const PANEL_X = (CANVAS_W - PANEL_W) / 2;
const PANEL_Y = (CANVAS_H - PANEL_H) / 2;
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
const ASSET_BASE_URL = import.meta.env.BASE_URL || '/';

function resolveAssetUrl(path: string): string {
  return `${ASSET_BASE_URL}${path.replace(/^\/+/, '')}`;
}

interface FormData {
  name: string;
  status: string;
  issuedDate: string;
  serialId: string;
  description: string;
  qrContent: string;
  qrToken: string;
  qrRecord: string;
}

export function CardGenerator() {
  const CARD_GENERATOR_SESSION_KEY = 'v-id-card-generator-session';
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const siteOrigin = window.location.origin;

  const [form, setForm] = useState<FormData>({
    name: 'ELIZA REED',
    status: 'VERIFIED',
    issuedDate: '',
    serialId: '',
    description: 'THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.',
    qrContent: '',
    qrToken: 'ABGD',
    qrRecord: 'SECURE DATA PROOF',
  });

  const [sha256Hash, setSha256Hash] = useState<string>('');
  const [citizenId, setCitizenId] = useState<string>('');
  const [accessError, setAccessError] = useState<string | null>(null);

  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [textureImg, setTextureImg] = useState<HTMLImageElement | null>(null);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const formatIssuedDate = useCallback((date = new Date()) => {
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }, []);

  const generateSerialId = useCallback(() => {
    const now = Date.now();
    const ts = now.toString(36).toUpperCase().slice(-6);
    const seq = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `V${ts.slice(0, 3)}-${ts.slice(3)}${seq.slice(0, 1)}-${seq.slice(1)}${now.toString(16).toUpperCase().slice(-3)}`;
  }, []);

  useEffect(() => {
    const initializeCard = async () => {
      const isLocalPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
      const savedAvatar = isLocalPreview ? resolveAssetUrl('hero_figure.png') : localStorage.getItem('vid_uploaded_avatar');
      const savedName = isLocalPreview ? 'Preview Character' : localStorage.getItem('vid_character_name');
      const creatorName = isLocalPreview ? 'VAID Preview' : localStorage.getItem('vid_creator_name');
      const hasCardSession = isLocalPreview || sessionStorage.getItem(CARD_GENERATOR_SESSION_KEY) === '1';

      if (!savedAvatar || !savedName || !creatorName) {
        sessionStorage.removeItem(CARD_GENERATOR_SESSION_KEY);
        setAccessError('缺少生成证书所需的数据，请从首页重新开始。');
        navigate('/', { replace: true });
        return;
      }

      if (!hasCardSession && !consumeGenerationReady()) {
        setAccessError('本次生成链接已失效，请返回首页重新发起生成。');
        navigate('/', { replace: true });
        return;
      }

      sessionStorage.setItem(CARD_GENERATOR_SESSION_KEY, '1');

      const issuedDate = formatIssuedDate();

      setForm(prev => ({
        ...prev,
        name: savedName,
        issuedDate,
        serialId: 'Generating...',
      }));

      const serialId = generateSerialId();

      (async () => {
        try {
          if (isLocalPreview) {
            const hashValue = await calculateSHA256(`${savedName}:${creatorName}:${issuedDate}:${savedAvatar}`);
            setSha256Hash(hashValue);
            setCitizenId(serialId);
            setForm(prev => ({
              ...prev,
              serialId,
              qrContent: `${siteOrigin}/verify/${serialId}`,
            }));
            return;
          }

          const registeredFriendlyId = localStorage.getItem('vid_registered_friendly_id') || '';
          const registeredHash = localStorage.getItem('vid_registered_hash') || '';
          if (registeredFriendlyId && registeredHash) {
            setCitizenId(registeredFriendlyId);
            setSha256Hash(registeredHash);
            setForm(prev => ({
              ...prev,
              serialId: registeredFriendlyId,
              qrContent: `${siteOrigin}/verify/${registeredFriendlyId}`,
            }));
            return;
          }

          let imageUrl = '';
          let hashValue = '';
          const originalFileHash = localStorage.getItem('vid_original_file_hash') || '';
          const originalFilePath = localStorage.getItem('vid_original_file_path') || '';

          if (!originalFileHash || !originalFilePath) {
            setAccessError('缺少原始文件校验信息，请返回首页重新发起生成。');
            return;
          }

          if (!savedAvatar) {
            setAccessError('缺少证书头像，请返回首页重新发起生成。');
            return;
          }

          console.log('[CardGenerator] Uploading thumbnail to Storage...');
          const uploadedUrl = await uploadImageToStorage(savedAvatar, `${serialId}.png`);

          if (!uploadedUrl) {
            setAccessError('证书图片上传失败，请返回首页重试。');
            return;
          }

          imageUrl = uploadedUrl;
          console.log('[CardGenerator] Thumbnail uploaded successfully:', imageUrl);

          hashValue = originalFileHash;
          setSha256Hash(hashValue);

          const { data, error } = await supabase.functions.invoke('v-id-register', {
            body: {
              character_name: savedName,
              creator_name: creatorName,
              sha256_hash: hashValue,
              image_url: imageUrl,
              original_file_path: originalFilePath,
            },
          });

          if (error) {
            console.error('Error registering VAID:', error);
            setAccessError('证书注册失败，请返回首页重试。若问题持续，请检查登录状态和剩余额度。');
            return;
          }

          if (data?.success && data?.friendly_id) {
            console.log('Successfully registered VAID, friendly_id:', data.friendly_id);
            const friendlyId = data.friendly_id;
            setCitizenId(friendlyId);
            setForm(prev => ({
              ...prev,
              serialId: friendlyId,
              qrContent: `${siteOrigin}/verify/${friendlyId}`,
            }));
            localStorage.removeItem('vid_original_file_hash');
            localStorage.removeItem('vid_original_file_path');
            localStorage.setItem('vid_registered_friendly_id', friendlyId);
            localStorage.setItem('vid_registered_hash', hashValue);
          } else {
            console.error('VAID registration returned no friendly_id:', data);
            setAccessError('证书注册没有返回有效编号，请返回首页重试。');
          }
        } catch (err) {
          console.error('Unexpected error:', err);
          setAccessError('证书注册过程中发生异常，请返回首页重试。');
        }
      })();
    };

    initializeCard();
  }, [CARD_GENERATOR_SESSION_KEY, formatIssuedDate, generateSerialId, navigate, siteOrigin]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image load failed: ${src}`));
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      const bgUrl = resolveAssetUrl('bg.jpg');
      const logoUrl = resolveAssetUrl('vaid_logo_mark.png');
      const textureUrl = resolveAssetUrl('grid_texture.png');

      const [bgResult, logoResult, textureResult] = await Promise.allSettled([
        loadImage(bgUrl),
        loadImage(logoUrl),
        loadImage(textureUrl),
      ]);

      if (bgResult.status === 'fulfilled') {
        setBgImg(bgResult.value);
      } else {
        setBgImg(null);
        console.error('[CardGenerator] Failed to load background image:', bgUrl, bgResult.reason);
      }

      if (logoResult.status === 'fulfilled') {
        setLogoImg(logoResult.value);
      } else {
        setLogoImg(null);
        console.error('[CardGenerator] Failed to load logo image:', logoUrl, logoResult.reason);
      }

      if (textureResult.status === 'fulfilled') {
        setTextureImg(textureResult.value);
      } else {
        setTextureImg(null);
        console.error('[CardGenerator] Failed to load grid texture image:', textureUrl, textureResult.reason);
      }

      const isLocalPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
      const savedAvatar = isLocalPreview ? resolveAssetUrl('hero_figure.png') : localStorage.getItem('vid_uploaded_avatar');
      if (!savedAvatar) {
        setAvatarImg(null);
        return;
      }

      try {
        const avatarImage = await loadImage(savedAvatar);
        setAvatarImg(avatarImage);
      } catch (error) {
        setAvatarImg(null);
        console.error('[CardGenerator] Failed to load saved avatar image from localStorage.', error);
      }
    };
    loadResources();
  }, [loadImage]);

  const generateQR = useCallback(async () => {
    try {
      const verifyUrl = citizenId
        ? `${siteOrigin}/verify/${citizenId}`
        : 'https://www.baidu.com';

      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#f18ab5', light: '#00000000' },
        errorCorrectionLevel: 'M',
      });
      const img = await loadImage(qrDataUrl);
      setQrImg(img);
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  }, [citizenId, loadImage, siteOrigin]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const hexToRgba = (hex: string, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
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
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
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
  };

  const getAvatarGeometry = () => {
    const outerDiameter = PANEL_W * AVATAR_DIAMETER_RATIO;
    const cx = PANEL_X + PANEL_W * AVATAR_CENTER_X_RATIO;
    const cy = PANEL_Y + PANEL_H * AVATAR_CENTER_Y_RATIO;
    const ringR = outerDiameter / 2;
    const haloR = ringR * 1.24;
    const imageR = ringR * AVATAR_IMAGE_RATIO;

    return {
      cx,
      cy,
      ringR,
      haloR,
      imageR,
      outerDiameter,
    };
  };

  const getDividerGeometry = () => {
    const { cy, ringR } = getAvatarGeometry();
    const dividerHalfLength = ringR * DIVIDER_LENGTH_SCALE;
    const dividerTopHalfLength = dividerHalfLength * DIVIDER_TOP_SCALE;
    return {
      lx: PANEL_X + PANEL_W * DIVIDER_X_RATIO,
      ly1: cy - dividerTopHalfLength,
      ly2: cy + dividerHalfLength,
    };
  };

  const getQRCodeGeometry = () => {
    const plateX = PANEL_X + PANEL_W * QR_PLATE_X_RATIO;
    const plateW = PANEL_W * QR_PLATE_W_RATIO;
    const plateH = PANEL_H * QR_PLATE_H_RATIO;
    const { ly2 } = getDividerGeometry();
    const plateY = ly2 - plateH;
    const qs = plateW * QR_MODULE_SIZE_IN_PLATE_RATIO;
    const qx = plateX + plateW * QR_MODULE_INSET_X_RATIO;
    const qy = plateY + plateH * QR_MODULE_INSET_Y_RATIO;

    return {
      plateX,
      plateY,
      plateW,
      plateH,
      qx,
      qy,
      qs,
    };
  };

  const drawPanel = (ctx: CanvasRenderingContext2D) => {
    if (bgImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
      ctx.clip();
      ctx.filter = 'blur(6px) brightness(1.15) saturate(1.06)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
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
  };

  const drawTechTexture = (ctx: CanvasRenderingContext2D) => {
    if (!textureImg) return;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.clip();

    // Keep texture clearly visible on the dark glass panel.
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
  };
  const drawCardMistBlur = (ctx: CanvasRenderingContext2D) => {
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
  };

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
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
    const lx = (CANVAS_W - logoW) / 2;
    const ly = 58;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.drawImage(offscreen, lx, ly, logoW, logoH);

    // Neon bloom passes for logo.
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

  };

  const drawAvatar = (ctx: CanvasRenderingContext2D) => {
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
      // Mostly solid teal/magenta, with only subtle blend at the splice zones.
      gradient.addColorStop(0.0, '#32d7d2');
      gradient.addColorStop(0.47, '#32d7d2');
      gradient.addColorStop(0.5, '#e040a0');
      gradient.addColorStop(0.97, '#e040a0');
      gradient.addColorStop(1.0, '#32d7d2');
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

    // Neon bloom pass for the outer ring.
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

    // Subtle outer orbit hints for extra rotational feel.
    const outerOrbits = [
      { r: ringR * 1.06, a1: Math.PI * 0.12, a2: Math.PI * 0.42, w: 1.2, c: 'rgba(150, 232, 248, 0.30)' },
      { r: ringR * 1.08, a1: Math.PI * 0.78, a2: Math.PI * 1.06, w: 1.1, c: 'rgba(216, 136, 214, 0.28)' },
      { r: ringR * 1.05, a1: Math.PI * 1.36, a2: Math.PI * 1.70, w: 1.2, c: 'rgba(146, 226, 244, 0.26)' },
      { r: ringR * 1.07, a1: Math.PI * 1.92, a2: Math.PI * 2.20, w: 1.0, c: 'rgba(224, 146, 220, 0.24)' },
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

    // Add short/long orbit dashes with stable pseudo-random distribution.
    const dashCount = 13;
    for (let i = 0; i < dashCount; i++) {
      const seed = i * 1.371 + 0.618;
      const t = (Math.sin(seed * 12.9898) + 1) * 0.5;
      const t2 = (Math.sin(seed * 7.233 + 2.41) + 1) * 0.5;
      const t3 = (Math.sin(seed * 5.921 + 1.17) + 1) * 0.5;

      const radius = ringR * (0.84 + t * 0.14);
      const start = t2 * Math.PI * 2;
      const span = (0.12 + t3 * 0.22) * Math.PI;
      const end = start + span;
      const isCool = i % 2 === 0;
      const color = isCool
        ? `rgba(168, 236, 255, ${0.3 + t * 0.24})`
        : `rgba(182, 154, 255, ${0.28 + t * 0.24})`;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
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

      const imgW = avatarImg.width;
      const imgH = avatarImg.height;
      const minSide = Math.min(imgW, imgH);
      const sx = (imgW - minSide) / 2;
      const sy = (imgH - minSide) / 2;
      const targetSize = imageR * 2 * AVATAR_COVER_SCALE;
      const dx = cx - targetSize / 2;
      const dy = cy - targetSize / 2;

      ctx.filter = 'saturate(1.02) brightness(0.98) contrast(1.02)';
      ctx.globalAlpha = 0.95;
      ctx.drawImage(
        avatarImg,
        sx,
        sy,
        minSide,
        minSide,
        dx,
        dy,
        targetSize,
        targetSize
      );
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
  };

  const drawDividerLine = (ctx: CanvasRenderingContext2D) => {
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

    // Neon pass for divider core.
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
  };

  const drawTextFields = (ctx: CanvasRenderingContext2D) => {
    const startX = PANEL_X + PANEL_W * TEXT_START_X_RATIO;
    const labelStyle = 'rgba(205, 198, 183, 0.84)';
    const valueStyle = 'rgba(247, 241, 229, 0.98)';
    const sharedFont = `600 ${INFO_TEXT_FONT_SIZE}px "Avenir Next", "Segoe UI", system-ui`;
    const labelGap = 11;

    const lines = [
      {
        label: 'NAME:',
        value: form.name,
        y: PANEL_Y + PANEL_H * TEXT_NAME_Y_RATIO,
        valueColor: valueStyle,
      },
      {
        label: 'STATUS:',
        value: form.status,
        y: PANEL_Y + PANEL_H * TEXT_STATUS_Y_RATIO,
        valueColor: '#1fe06b',
      },
      {
        label: 'ISSUED:',
        value: form.issuedDate,
        y: PANEL_Y + PANEL_H * TEXT_ISSUED_Y_RATIO,
        valueColor: valueStyle,
      },
      {
        label: 'ID:',
        value: form.serialId,
        y: PANEL_Y + PANEL_H * TEXT_ID_Y_RATIO,
        valueColor: valueStyle,
      },
    ] as const;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((line) => {
      ctx.font = sharedFont;
      ctx.fillStyle = labelStyle;
      ctx.fillText(line.label, startX, line.y);

      const labelWidth = ctx.measureText(line.label).width;
      const valueX = startX + labelWidth + labelGap;

      ctx.font = sharedFont;
      if (line.label === 'STATUS:') {
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
  };

  const drawQRCode = (ctx: CanvasRenderingContext2D) => {
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
      // Neon only for QR modules (exclude the outer plate border).
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
    ctx.fillText('PROOF:', textCenterX, proofLabelY, textSafeWidth);

    ctx.font = `700 ${QR_TEXT_SECONDARY_SIZE}px "Avenir Next", "Helvetica Neue", sans-serif`;
    ctx.fillStyle = 'rgba(170, 170, 158, 0.82)';
    ctx.fillText('Blockchain sealed', textCenterX, proofValueY, textSafeWidth);
    ctx.restore();
  };

  const drawDescription = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.font = `500 ${DESCRIPTION_TEXT_SIZE}px "Segoe UI", system-ui`;
    ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(form.description, CANVAS_W / 2, 514);
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 【锁定显示尺寸，防止挤压变形】
    canvas.width = REAL_W;
    canvas.height = REAL_H;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    }

    drawPanel(ctx);
    drawTechTexture(ctx);
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawQRCode(ctx);
    drawDescription(ctx);
    drawCardMistBlur(ctx);
  // The drawing helpers are evaluated in this render pass; we only retrigger
  // when the source assets/form state change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarImg, bgImg, form, logoImg, qrImg, textureImg]);

  const exportPNG = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = REAL_W;
      canvas.height = REAL_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }
      ctx.scale(DPR, DPR);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (bgImg) {
        drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      }
      drawPanel(ctx);
      drawTechTexture(ctx);
      drawLogo(ctx);
      drawAvatar(ctx);
      drawDividerLine(ctx);
      drawTextFields(ctx);
      drawDescription(ctx);
      drawQRCode(ctx);
      drawCardMistBlur(ctx);

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Card image export failed'));
          }
        }, 'image/png');
      });

      const verificationGuide = `VAID VERIFICATION GUIDE
=======================

ENGLISH
-------

WHAT IS VAID?
VAID stands for Virtual Asset ID, meaning "Virtual Asset Identity".

A VAID record gives a digital asset, virtual character, or original digital work a unique and verifiable identity. It records key identity information and connects it to a chain-based time archive, helping make the asset traceable, verifiable, and resistant to later alteration.

VAID DETAILS:
Character Name: ${form.name}
Citizen ID: ${form.serialId}
Issue Date: ${form.issuedDate}
VAID Proof Code: ${sha256Hash}

HOW TO VERIFY:
1. Open the public verification page:
   ${siteOrigin}/verify/${citizenId}
2. Compare the certificate information with this package.
3. Check the proof status shown on the verification page.
4. Keep this package as your local proof archive.


中文
----

什么是 VAID？
VAID 是 Virtual Asset ID 的缩写，意思是“虚拟资产身份”。

VAID 记录为数字资产、虚拟角色或原创数字作品创建一个唯一且可验证的身份。它记录关键身份信息，并连接至链上时间存证体系，使该资产具备可追溯、可验证和防篡改的证明属性。

VAID 信息：
角色名称：${form.name}
公民编号：${form.serialId}
生成日期：${form.issuedDate}
VAID 证明码：${sha256Hash}

如何验证：
1. 打开公开验证页：
   ${siteOrigin}/verify/${citizenId}
2. 对照验证页中的证书信息与本下载包是否一致。
3. 查看验证页显示的存证状态。
4. 请妥善保存本下载包，作为本地证明档案。


日本語
------

VAID とは？
VAID は Virtual Asset ID の略称で、「仮想資産アイデンティティ」を意味します。

VAID レコードは、デジタル資産、仮想キャラクター、またはオリジナルのデジタル作品に、一意で検証可能なアイデンティティを与えます。重要な識別情報を記録し、チェーンベースの時刻アーカイブに接続することで、その資産を追跡可能、検証可能、かつ後から改ざんされにくいものにします。

VAID 情報：
キャラクター名：${form.name}
シチズン ID：${form.serialId}
発行日時：${form.issuedDate}
VAID 証明コード：${sha256Hash}

確認方法：
1. 公開検証ページを開きます：
   ${siteOrigin}/verify/${citizenId}
2. 検証ページの証明書情報と、このダウンロードパッケージの内容を照合します。
3. 検証ページに表示される証明ステータスを確認します。
4. このパッケージをローカルの証明アーカイブとして安全に保管してください。

© VAID Protocol
`;

      const zip = new JSZip();

      zip.file('VAID_Certificate.png', imageBlob);
      zip.file('Proof_Verification_Guide.txt', verificationGuide);

      if (citizenId) {
        try {
          const { data: otsData, error: otsError } = await supabase.storage
            .from('v-id-images')
            .download(`ots/${citizenId}.ots`);
          if (otsData) {
            zip.file(`${citizenId}.ots`, otsData);
          } else if (otsError) {
            console.warn('[CardGenerator] OTS file unavailable, continuing without it:', otsError);
          }
        } catch (error) {
          console.warn('[CardGenerator] OTS file download failed, continuing without it:', error);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.download = `VAID_${form.serialId}_Complete.zip`;
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('[CardGenerator] Failed to create download bundle:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (accessError) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">无法继续生成</h1>
          <p className="text-slate-300 leading-relaxed">{accessError}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem(CARD_GENERATOR_SESSION_KEY);
              navigate('/');
            }}
            className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#030713] flex flex-col items-center">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 12% 12%, rgba(0, 188, 255, 0.14), transparent 24%),
              radial-gradient(circle at 90% 22%, rgba(255, 46, 72, 0.12), transparent 26%),
              linear-gradient(115deg, rgba(5, 18, 45, 0.95), rgba(3, 7, 19, 0.96) 52%, rgba(4, 10, 25, 0.98))
            `,
            backgroundSize: 'cover, cover, cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `
              linear-gradient(rgba(42, 150, 255, 0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(42, 150, 255, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-slate-400/22" />
      </div>

      <div className="relative z-10 max-w-[1200px] w-full p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Identity Preview</h1>
        <div className="flex gap-4">
          <button
            onClick={exportPNG}
            disabled={isDownloading}
            className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:cursor-wait disabled:opacity-70"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="relative z-10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]" />
      <p className="relative z-10 mt-6 text-slate-500 text-xs text-center max-w-md leading-relaxed">
        * PROOF OF IDENTITY RECORDED BY VAID
      </p>
    </div>
  );
}
