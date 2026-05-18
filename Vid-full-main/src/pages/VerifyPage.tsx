import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ExternalLink, Loader2, AlertCircle, Calendar, User, Hash, Lock } from 'lucide-react';
import { supabase } from '../utils/supabase';
import QRCode from 'qrcode';
import JSZip from 'jszip';

interface VIDRecord {
  id: string;
  character_name: string;
  creator_name: string;
  sha256_hash: string;
  image_url: string;
  created_at: string;
  ots_status: string;
  ots_file_path: string | null;
}

const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
const PANEL_W = 880;
const PANEL_H = 494;
const PANEL_X = (CANVAS_W - PANEL_W) / 2;
const PANEL_Y = (CANVAS_H - PANEL_H) / 2;
const PANEL_RADIUS = 32;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';
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

export function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [record, setRecord] = useState<VIDRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificateReady, setCertificateReady] = useState(false);
  const [otsStatus, setOtsStatus] = useState<string>('pending');

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id) {
        console.error('[VerifyPage] No ID provided');
        setError('Invalid verification ID');
        setLoading(false);
        return;
      }

      console.log('[VerifyPage] Fetching record for ID:', id);

      try {
        const normalizedId = id.toUpperCase();
        console.log('[VerifyPage] Normalized ID:', normalizedId);

        const { data, error } = await supabase
          .from('public_v_ids')
          .select('friendly_id, character_name, creator_name, sha256_hash, image_url, created_at, ots_status, ots_file_path')
          .eq('friendly_id', normalizedId)
          .maybeSingle();

        console.log('[VerifyPage] Query result:', { data, error });

        if (error) throw error;

        if (!data) {
          console.error('[VerifyPage] No record found for ID:', normalizedId);
          setError('No record found for this Citizen ID');
        } else {
          console.log('[VerifyPage] Record found:', data);
          const rec = { ...data, id: data.friendly_id };
          setRecord(rec);
          setOtsStatus(data.ots_status || 'pending');
        }
      } catch (err) {
        console.error('[VerifyPage] Error fetching record:', err);
        setError('Failed to verify record');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id]);

  useEffect(() => {
    if (!record || otsStatus === 'confirmed') return;
    if (otsStatus !== 'stamped') return;

    const verifyOTS = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ots-verify`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ friendly_id: record.id }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ots_status) setOtsStatus(json.ots_status);
        }
      } catch (err) {
        console.error('[OTS] Verify request failed:', err);
      }
    };

    verifyOTS();
  }, [record, otsStatus]);

  const loadImage = useCallback(async (src: string, timeout = 10000): Promise<HTMLImageElement> => {
    const isExternal = src.startsWith('http://') || src.startsWith('https://');

    const loadFromSrc = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        if (!isExternal || url.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
        const timeoutId = setTimeout(() => {
          img.src = '';
          reject(new Error(`Image load timeout: ${url.substring(0, 50)}...`));
        }, timeout);
        img.onload = () => { clearTimeout(timeoutId); resolve(img); };
        img.onerror = () => { clearTimeout(timeoutId); reject(new Error(`Failed to load: ${url.substring(0, 50)}`)); };
        img.src = url;
      });

    if (isExternal && !src.startsWith('data:')) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(src, { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        try {
          const img = await loadFromSrc(blobUrl);
          return img;
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } catch {
        return loadFromSrc(src);
      }
    }

    return loadFromSrc(src);
  }, []);

  const renderCertificate = useCallback(async () => {
    if (!record || !canvasRef.current) {
      console.log('[VerifyPage] renderCertificate skipped:', { record: !!record, canvas: !!canvasRef.current });
      return;
    }

    console.log('[VerifyPage] Starting certificate render for:', record.id);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[VerifyPage] Failed to get canvas context');
      return;
    }

    canvas.width = CANVAS_W * DPR;
    canvas.height = CANVAS_H * DPR;
    ctx.scale(DPR, DPR);

    try {
      console.log('[VerifyPage] Loading images...');
      const loadPromises: Promise<HTMLImageElement | null>[] = [
        loadImage('/bg.jpg').catch(err => {
          console.warn('[VerifyPage] Failed to load background:', err);
          return null;
        }),
        loadImage('/vaid_logo_mark.png').catch(err => {
          console.warn('[VerifyPage] Failed to load logo:', err);
          return null;
        }),
        loadImage('/grid_texture.png').catch(err => {
          console.warn('[VerifyPage] Failed to load texture:', err);
          return null;
        }),
      ];

      if (record.image_url) {
        const isDataUrl = record.image_url.startsWith('data:');
        const avatarTimeout = isDataUrl ? 15000 : 10000;

        loadPromises.push(
          loadImage(record.image_url, avatarTimeout).catch(err => {
            console.warn('[VerifyPage] Failed to load avatar:', err);
            return null;
          })
        );
      } else {
        loadPromises.push(Promise.resolve(null));
      }

      const [bgImg, logoImg, textureImg, avatarImg] = await Promise.all(loadPromises);
      console.log('[VerifyPage] Images loaded:', { bg: !!bgImg, logo: !!logoImg, texture: !!textureImg, avatar: !!avatarImg });

      console.log('[VerifyPage] Generating QR code for:', record.id);
      let qrImg: HTMLImageElement | null = null;
      try {
        const qrUrl = `${window.location.origin}/verify/${record.id}`;
        console.log('[VerifyPage] QR URL:', qrUrl);
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 240,
          margin: 1,
          color: { dark: '#f18ab5', light: '#00000000' },
          errorCorrectionLevel: 'M',
        });
        qrImg = await loadImage(qrDataUrl);
        console.log('[VerifyPage] QR code loaded successfully');
      } catch (err) {
        console.error('[VerifyPage] Failed to generate/load QR code:', err);
      }

      const issueDate = new Date(record.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }).toUpperCase();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (bgImg) drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);

      drawPanel(ctx, bgImg);
      drawTechTexture(ctx, textureImg);
      drawLogo(ctx, logoImg);
      drawAvatar(ctx, avatarImg);
      drawDividerLine(ctx);
      drawTextFields(ctx, {
        name: record.character_name,
        status: 'VERIFIED',
        issuedDate: issueDate,
        serialId: record.id.toUpperCase(),
      });
      drawQRCode(ctx, qrImg);
      drawDescription(ctx, 'THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.');
      drawCardMistBlur(ctx);

      console.log('[VerifyPage] Certificate rendered successfully');
      setCertificateReady(true);
    } catch (err) {
      console.error('[VerifyPage] Failed to render certificate:', err);
      setCertificateReady(true);
    }
  }, [record, loadImage]);

  useEffect(() => {
    if (record) {
      renderCertificate();
    }
  }, [record, renderCertificate]);

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
    ctx.beginPath();
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

  const hexToRgba = (hex: string, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getAvatarGeometry = () => {
    const outerDiameter = PANEL_W * AVATAR_DIAMETER_RATIO;
    const cx = PANEL_X + PANEL_W * AVATAR_CENTER_X_RATIO;
    const cy = PANEL_Y + PANEL_H * AVATAR_CENTER_Y_RATIO;
    const ringR = outerDiameter / 2;
    const haloR = ringR * 1.24;
    const imageR = ringR * AVATAR_IMAGE_RATIO;
    return { cx, cy, ringR, haloR, imageR };
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
    return {
      plateX,
      plateY,
      plateW,
      plateH,
      qx: plateX + plateW * QR_MODULE_INSET_X_RATIO,
      qy: plateY + plateH * QR_MODULE_INSET_Y_RATIO,
      qs,
    };
  };

  const drawPanel = (ctx: CanvasRenderingContext2D, bgImg: HTMLImageElement | null) => {
    if (bgImg) {
      ctx.save();
      roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
      ctx.clip();
      ctx.filter = 'blur(6px) brightness(1.15) saturate(1.06)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    ctx.save();
    roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 235, 255, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.shadowColor = 'rgba(140, 180, 255, 0.18)';
    ctx.shadowBlur = 32;
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  };

  const drawTechTexture = (ctx: CanvasRenderingContext2D, textureImg: HTMLImageElement | null) => {
    if (!textureImg) return;
    ctx.save();
    roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.clip();
    ctx.globalAlpha = 0.18;
    ctx.filter = 'contrast(1.35) brightness(1.08)';
    const textureScale = 1.5;
    const scaledW = PANEL_W * textureScale;
    const scaledH = PANEL_H * textureScale;
    drawCover(ctx, textureImg, PANEL_X - (scaledW - PANEL_W) / 2, PANEL_Y - (scaledH - PANEL_H) / 2, scaledW, scaledH);
    ctx.restore();
  };

  const drawLogo = (ctx: CanvasRenderingContext2D, logoImg: HTMLImageElement | null) => {
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
      const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
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
    ctx.drawImage(offscreen, lx, ly, logoW, logoH);
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = 'rgba(120, 232, 248, 0.72)';
    ctx.shadowBlur = 24;
    ctx.drawImage(offscreen, lx, ly, logoW, logoH);
    ctx.shadowColor = 'rgba(228, 116, 204, 0.62)';
    ctx.shadowBlur = 14;
    ctx.drawImage(offscreen, lx, ly, logoW, logoH);
    ctx.restore();
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D, avatarImg: HTMLImageElement | null) => {
    const { cx, cy, ringR, haloR, imageR } = getAvatarGeometry();
    ctx.save();
    const ambientGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    ambientGlow.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    ambientGlow.addColorStop(0.52, hexToRgba(AVATAR_COLOR_START, 0.12));
    ambientGlow.addColorStop(0.78, hexToRgba(AVATAR_COLOR_END, 0.11));
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    const conicCapableContext = ctx as CanvasRenderingContext2D & {
      createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient;
    };
    const ringStroke = typeof conicCapableContext.createConicGradient === 'function'
      ? conicCapableContext.createConicGradient(-Math.PI / 2, cx, cy)
      : ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
    ringStroke.addColorStop(0, '#32d7d2');
    ringStroke.addColorStop(0.47, '#32d7d2');
    ringStroke.addColorStop(0.5, '#e040a0');
    ringStroke.addColorStop(0.97, '#e040a0');
    ringStroke.addColorStop(1, '#32d7d2');
    ctx.strokeStyle = ringStroke;
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(80, 200, 220, 0.20)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 7;
    ctx.shadowColor = 'rgba(138, 214, 255, 0.55)';
    ctx.shadowBlur = 22;
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.shadowColor = 'rgba(230, 140, 220, 0.48)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();

    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, imageR, 0, Math.PI * 2);
      ctx.clip();
      const minSide = Math.min(avatarImg.width, avatarImg.height);
      const sx = (avatarImg.width - minSide) / 2;
      const sy = (avatarImg.height - minSide) / 2;
      const targetSize = imageR * 2 * AVATAR_COVER_SCALE;
      ctx.filter = 'saturate(1.02) brightness(0.98) contrast(1.02)';
      ctx.globalAlpha = 0.95;
      ctx.drawImage(avatarImg, sx, sy, minSide, minSide, cx - targetSize / 2, cy - targetSize / 2, targetSize, targetSize);
      ctx.restore();
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
    ctx.fillStyle = 'rgba(215, 244, 235, 0.62)';
    ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(122, 238, 230, 0.34)';
    ctx.shadowColor = 'rgba(122, 238, 230, 0.58)';
    ctx.shadowBlur = 12;
    ctx.fillRect(lx - 1, ly1, 2, ly2 - ly1);
    ctx.restore();
  };

  const drawTextFields = (
    ctx: CanvasRenderingContext2D,
    fields: { name: string; status: string; issuedDate: string; serialId: string }
  ) => {
    const startX = PANEL_X + PANEL_W * TEXT_START_X_RATIO;
    const labelStyle = 'rgba(205, 198, 183, 0.84)';
    const valueStyle = 'rgba(247, 241, 229, 0.98)';
    const sharedFont = `600 ${INFO_TEXT_FONT_SIZE}px "Avenir Next", "Segoe UI", system-ui`;
    const labelGap = 11;
    const lines = [
      { label: 'NAME:', value: fields.name, y: PANEL_Y + PANEL_H * TEXT_NAME_Y_RATIO, valueColor: valueStyle },
      { label: 'STATUS:', value: fields.status, y: PANEL_Y + PANEL_H * TEXT_STATUS_Y_RATIO, valueColor: '#1fe06b' },
      { label: 'ISSUED:', value: fields.issuedDate, y: PANEL_Y + PANEL_H * TEXT_ISSUED_Y_RATIO, valueColor: valueStyle },
      { label: 'ID:', value: fields.serialId, y: PANEL_Y + PANEL_H * TEXT_ID_Y_RATIO, valueColor: valueStyle },
    ];

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((line) => {
      ctx.font = sharedFont;
      ctx.fillStyle = labelStyle;
      ctx.fillText(line.label, startX, line.y);
      const valueX = startX + ctx.measureText(line.label).width + labelGap;
      if (line.label === 'STATUS:') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(31, 224, 107, 0.63)';
        ctx.shadowBlur = 36;
        ctx.shadowColor = 'rgba(31, 224, 107, 0.95)';
        ctx.fillText(line.value, valueX, line.y);
        ctx.restore();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(31, 224, 107, 0.95)';
      }
      ctx.fillStyle = line.valueColor;
      ctx.fillText(line.value, valueX, line.y);
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  };

  const drawQRCode = (ctx: CanvasRenderingContext2D, qrImg: HTMLImageElement | null) => {
    const { plateX, plateY, plateW, plateH, qx, qy, qs } = getQRCodeGeometry();
    const textCenterX = plateX + plateW / 2;
    ctx.save();
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
      ctx.restore();
      ctx.drawImage(qrImg, qx, qy, qs, qs);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${QR_TEXT_PRIMARY_SIZE}px "Avenir Next", "Helvetica Neue", sans-serif`;
    ctx.fillStyle = 'rgba(170, 170, 158, 0.82)';
    ctx.fillText('PROOF:', textCenterX, plateY + plateH * QR_PROOF_LABEL_Y_RATIO, plateW - 12);
    ctx.font = `700 ${QR_TEXT_SECONDARY_SIZE}px "Avenir Next", "Helvetica Neue", sans-serif`;
    ctx.fillText('Blockchain sealed', textCenterX, plateY + plateH * QR_PROOF_VALUE_Y_RATIO, plateW - 12);
    ctx.restore();
  };

  const drawDescription = (ctx: CanvasRenderingContext2D, description: string) => {
    ctx.save();
    ctx.font = `500 ${DESCRIPTION_TEXT_SIZE}px "Segoe UI", system-ui`;
    ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(description, CANVAS_W / 2, 514);
    ctx.restore();
  };

  const drawCardMistBlur = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.clip();
    ctx.filter = 'blur(20px)';
    ctx.globalCompositeOperation = 'screen';
    const mistBand = ctx.createLinearGradient(PANEL_X, PANEL_Y + PANEL_H * 0.22, PANEL_X + PANEL_W, PANEL_Y + PANEL_H * 0.92);
    mistBand.addColorStop(0, 'rgba(255, 228, 150, 0.0525)');
    mistBand.addColorStop(0.62, 'rgba(255, 214, 112, 0.025)');
    mistBand.addColorStop(1, 'rgba(255, 208, 98, 0.0175)');
    ctx.fillStyle = mistBand;
    ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    ctx.restore();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handleInspectProof = () => {
    const statusText =
      otsStatus === 'confirmed'
        ? '链上存证已确认。此 VAID 的数字存证印记已获得区块链网络确认。'
        : otsStatus === 'stamped'
          ? '链上时间锚点已提交。此 VAID 的数字存证印记正在等待区块链网络确认。'
          : otsStatus === 'failed'
            ? '链上存证提交失败。请稍后重试或联系 VAID。'
            : '链上存证处理中。系统正在为此 VAID 建立可验证的时间锚点。';

    window.alert(statusText);
  };

  const handleDownloadBundle = async () => {
    if (!record || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const proofText = `VAID PROTOCOL - PROOF OF EXISTENCE

Certificate ID: ${record.id}
Character Name: ${record.character_name}
Creator: ${record.creator_name}
Timestamp: ${formatDate(record.created_at)}

VAID DIGITAL SEAL:
${record.sha256_hash}

VERIFICATION GUIDE:
此文件包含您的 VAID 数字存证印记。该印记用于证明证书内容的唯一性，并与链上时间锚点共同构成可验证的存在证明。

VAID 协议：让虚拟，真实存在。

For more information, visit: ${window.location.origin}
`;

      const zip = new JSZip();

      zip.file('VAID_Certificate.png', imageBlob);
      zip.file('Proof_of_Existence.txt', proofText);

      if (record.ots_file_path || otsStatus === 'stamped' || otsStatus === 'confirmed') {
        const otsPath = record.ots_file_path || `ots/${record.id}.ots`;
        const { data: otsBlob } = await supabase.storage.from('v-id-images').download(otsPath);
        if (otsBlob) {
          zip.file(`${record.id}.ots`, otsBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VAID_Bundle_${record.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create bundle:', err);
      alert('Failed to create download bundle. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Verifying VAID Record...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-16">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-slate-400 hover:text-cyan-400 transition-colors text-sm md:text-base"
        >
          ← Back to Home
        </button>

        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="w-20 h-20 md:w-24 md:h-24 animate-spin-slow" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.8 }} />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                  fill="none"
                  stroke="url(#hexGradient)"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-8 h-8 md:w-10 md:h-10 text-cyan-400 animate-breathe" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            VERIFIED BY VAID PROTOCOL
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Digital Identity Record Confirmed</p>
        </div>

        <div className="backdrop-blur-xl bg-[#0f1629]/80 border border-cyan-500/30 rounded-2xl p-4 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-4">Certificate Preview</h2>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-3 md:p-4 flex items-center justify-center relative overflow-hidden">
                {!certificateReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                )}
                <div className="w-full max-w-[1024px] aspect-video">
                  <canvas
                    ref={canvasRef}
                    className="block w-full h-full rounded-lg shadow-lg"
                    style={{ display: certificateReady ? 'block' : 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-2">Identity Metadata</h2>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">CHARACTER NAME</div>
                    <div className="text-xl md:text-2xl font-bold text-white break-words">{record.character_name}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">CREATOR</div>
                    <div className="text-lg md:text-xl font-semibold text-white break-words">{record.creator_name}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">CITIZEN ID</div>
                    <div className="text-sm md:text-base font-mono text-white break-all">{record.id}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">TIMESTAMP</div>
                    <div className="text-sm md:text-base text-white break-words">{formatDate(record.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 bg-black/60 border border-cyan-500/40 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3 mb-3">
              <Hash className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-bold text-cyan-400 mb-2">
                  VAID DIGITAL SEAL (数字存证印记)
                </div>
                <div className="font-mono text-xs md:text-sm text-green-400 break-all leading-relaxed bg-black/50 p-3 md:p-4 rounded-lg border border-green-500/30">
                  {record.sha256_hash}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 mb-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                otsStatus === 'confirmed' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' :
                otsStatus === 'stamped'   ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' :
                otsStatus === 'failed'    ? 'bg-red-400' :
                'bg-slate-500'
              }`} />
              <span className="text-xs font-mono text-slate-300">
                {otsStatus === 'confirmed' && '链上存证已确认'}
                {otsStatus === 'stamped'   && '链上时间锚点已提交，等待区块链网络确认'}
                {otsStatus === 'failed'    && '链上存证提交失败'}
                {otsStatus === 'pending'   && '链上存证处理中...'}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              此数字存证印记已进入 VAID 的链上时间锚定流程，用于形成不可篡改、可追溯的存在证明。
            </p>
          </div>

          <div className="mt-6 md:mt-8 grid sm:grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={handleDownloadBundle}
              disabled={!certificateReady}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30 text-sm md:text-base"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
              <span>Download Bundle</span>
            </button>

            <button
              onClick={handleInspectProof}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-transparent hover:bg-cyan-500/10 border-2 border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 font-bold rounded-xl transition-all group text-sm md:text-base"
            >
              <Lock className="w-4 h-4 md:w-5 md:h-5" />
              <span>Proof Status</span>
              <ExternalLink className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="mt-6 md:mt-8 p-4 md:p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-xl backdrop-blur-sm">
          <h3 className="text-base md:text-lg font-semibold text-cyan-400 mb-3">About This Verification</h3>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            此 VAID 记录已写入 VAID 的数字身份存证体系，并生成公开可验证的证书档案。
            系统会为原始作品生成唯一的数字存证印记，并将其接入区块链时间锚定流程，
            用于证明该数字身份在特定时间已经存在，且后续记录可追溯、可核验、不可随意篡改。
            下载包中包含配套的存证证明文件，可用于后续独立核验。
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes breathe {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(6,182,212,0.6)); }
          50% { opacity: 0.6; filter: drop-shadow(0 0 16px rgba(6,182,212,0.9)); }
        }
        .animate-breathe {
          animation: breathe 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
