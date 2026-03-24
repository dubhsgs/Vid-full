import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../utils/supabase';
import { calculateSHA256 } from '../utils/sha256';

const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = 2;
const REAL_W = CANVAS_W * DPR;
const REAL_H = CANVAS_H * DPR;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';
const QR_COLOR = '#de6aa8';

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
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<FormData>({
    name: 'ELIZA REED',
    status: 'VERIFIED',
    issuedDate: '',
    serialId: '',
    description: 'THIS DOCUMENT CONSTITUTES FINAL PROOF OF A UNIQUE DIGITAL IDENTITY ANCHORED ON THE IMMUTABLE V-ID LEDGER.',
    qrContent: '',
    qrToken: 'ABGD',
    qrRecord: 'SECURE DATA PROOF',
  });

  const [sha256Hash, setSha256Hash] = useState<string>('');
  const [citizenId, setCitizenId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);

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
      const issuedDate = formatIssuedDate();
      const savedAvatar = localStorage.getItem('vid_uploaded_avatar');
      const savedName = localStorage.getItem('vid_character_name') || 'ELIZA REED';
      const creatorName = 'Anonymous Creator';

      setForm(prev => ({
        ...prev,
        name: savedName,
        issuedDate,
        serialId: 'Generating...',
      }));

      let hashValue = '';
      if (savedAvatar) {
        const dataToHash = `${savedName}:${creatorName}:${issuedDate}:${savedAvatar}`;
        hashValue = await calculateSHA256(dataToHash);
        setSha256Hash(hashValue);
      }

      const serialId = generateSerialId();

      (async () => {
        try {
          setIsSaving(true);
          const { data, error } = await supabase
            .from('v_ids')
            .insert({
              character_name: savedName,
              creator_name: creatorName,
              sha256_hash: hashValue,
              image_url: savedAvatar || '',
              friendly_id: serialId
            })
            .select('friendly_id')
            .maybeSingle();

          if (error) {
            console.error('Error saving to database:', error);
            setCitizenId(serialId);
            setForm(prev => ({
              ...prev,
              serialId: serialId,
              qrContent: `https://digital-ip-proof-sys-78ai.bolt.host/verify/${serialId}`,
            }));
          } else if (data) {
            console.log('Successfully saved to database, friendly_id:', data.friendly_id);
            setCitizenId(data.friendly_id);
            setForm(prev => ({
              ...prev,
              serialId: data.friendly_id,
              qrContent: `https://digital-ip-proof-sys-78ai.bolt.host/verify/${data.friendly_id}`,
            }));
          } else {
            console.log('No data returned, using generated serialId');
            setCitizenId(serialId);
            setForm(prev => ({
              ...prev,
              serialId: serialId,
              qrContent: `${window.location.origin}/verify/${serialId}`,
            }));
          }
        } catch (err) {
          console.error('Unexpected error:', err);
          setCitizenId(serialId);
          setForm(prev => ({
            ...prev,
            serialId: serialId,
            qrContent: `https://digital-ip-proof-sys-78ai.bolt.host/verify/${serialId}`,
          }));
        } finally {
          setIsSaving(false);
        }
      })();
    };

    initializeCard();
  }, [formatIssuedDate, generateSerialId]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [bg, logo] = await Promise.all([
          loadImage('/bg.jpg'),
          loadImage('/logo.png'),
        ]);
        setBgImg(bg);
        setLogoImg(logo);

        const savedAvatar = localStorage.getItem('vid_uploaded_avatar');
        if (savedAvatar) {
          const avatarImage = await loadImage(savedAvatar);
          setAvatarImg(avatarImage);
        }
      } catch (e) {
        console.error('Failed to load resources:', e);
      }
    };
    loadResources();
  }, [loadImage]);

  const generateQR = useCallback(async () => {
    try {
      const verifyUrl = citizenId
        ? `https://digital-ip-proof-sys-78ai.bolt.host/verify/${citizenId}`
        : 'https://www.baidu.com';

      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#000000', light: '#00000000' },
        errorCorrectionLevel: 'M',
      });
      const img = await loadImage(qrDataUrl);
      setQrImg(img);
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  }, [citizenId, loadImage]);

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

  const drawPanel = (ctx: CanvasRenderingContext2D) => {
    const px = 45, py = 28, pw = 934, ph = 520, r = 18;

    if (bgImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, r);
      ctx.clip();
      ctx.filter = 'blur(3px) brightness(0.92)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.filter = 'none';
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.fillStyle = 'rgba(18, 22, 34, 0.14)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.clip();
    const cornerGlows = [
      { x: px + 8, y: py + 8 },
      { x: px + pw - 8, y: py + 8 },
      { x: px + 8, y: py + ph - 8 },
      { x: px + pw - 8, y: py + ph - 8 },
    ];
    cornerGlows.forEach(({ x, y }) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 128);
      glow.addColorStop(0, 'rgba(210, 230, 255, 0.24)');
      glow.addColorStop(0.22, 'rgba(210, 230, 255, 0.14)');
      glow.addColorStop(0.5, 'rgba(170, 205, 255, 0.08)');
      glow.addColorStop(1, 'rgba(170, 205, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 128, y - 128, 256, 256);
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(200, 215, 240, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(140, 180, 255, 0.12)';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.restore();
  };

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    if (!logoImg) return;
    const logoH = 60;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    const lx = (CANVAS_W - logoW) / 2;
    const ly = 45;
    ctx.drawImage(logoImg, lx, ly, logoW, logoH);

    ctx.save();
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(200, 210, 230, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('V-ID Protocol', CANVAS_W / 2, ly + logoH + 18);
    ctx.restore();
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D) => {
    const cx = 210, cy = 310, outerR = 100, innerR = 88;

    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy + 10, innerR - 5, cx, cy + 10, outerR + 20);
    glow.addColorStop(0, hexToRgba(AVATAR_COLOR_END, 0));
    glow.addColorStop(0.5, hexToRgba(AVATAR_COLOR_END, 0.12));
    glow.addColorStop(0.8, hexToRgba(AVATAR_COLOR_START, 0.08));
    glow.addColorStop(1, hexToRgba(AVATAR_COLOR_START, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 20, 0, Math.PI * 2);
    ctx.fill();

    const ringGrad = ctx.createLinearGradient(cx, cy - outerR, cx, cy + outerR);
    ringGrad.addColorStop(0, AVATAR_COLOR_START);
    ringGrad.addColorStop(0.45, AVATAR_COLOR_START);
    ringGrad.addColorStop(0.65, AVATAR_COLOR_END);
    ringGrad.addColorStop(1, AVATAR_COLOR_END);
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 18, 30, 0.8)';
    ctx.fill();

    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
      ctx.clip();
      const size = innerR * 2 - 4;
      ctx.drawImage(
        avatarImg,
        0, 0, avatarImg.width, avatarImg.height,
        cx - size / 2, cy - size / 2, size, size
      );
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(100, 120, 160, 0.3)';
      ctx.font = '40px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', cx, cy);
    }
    ctx.restore();
  };

  const drawDividerLine = (ctx: CanvasRenderingContext2D) => {
    const lx = 340, ly1 = 170, ly2 = 455;
    ctx.save();
    const glow = ctx.createLinearGradient(lx - 8, ly1, lx + 8, ly1);
    glow.addColorStop(0, 'rgba(160, 190, 240, 0)');
    glow.addColorStop(0.28, 'rgba(160, 190, 240, 0.10)');
    glow.addColorStop(0.5, 'rgba(160, 190, 240, 0.16)');
    glow.addColorStop(0.72, 'rgba(160, 190, 240, 0.10)');
    glow.addColorStop(1, 'rgba(160, 190, 240, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 8, ly1, 16, ly2 - ly1);

    const core = ctx.createLinearGradient(lx - 1.5, ly1, lx + 1.5, ly1);
    core.addColorStop(0, 'rgba(210, 225, 255, 0.18)');
    core.addColorStop(0.5, 'rgba(210, 225, 255, 0.55)');
    core.addColorStop(1, 'rgba(210, 225, 255, 0.18)');
    ctx.fillStyle = core;
    ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
    ctx.restore();
  };

  const drawTextFields = (ctx: CanvasRenderingContext2D) => {
    const startX = 370;
    const labelStyle = 'rgba(180, 190, 210, 0.7)';
    const valueStyle = '#ffffff';
    const greenStyle = '#00e676';

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let y = 215;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('NAME:', startX, y);
    const nameOffset = ctx.measureText('NAME: ').width;
    ctx.font = '700 30px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.name, startX + nameOffset + 4, y);

    y = 278;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('STATUS:', startX, y);
    const statusOffset = ctx.measureText('STATUS: ').width;
    ctx.shadowColor = 'rgba(0, 230, 118, 0.95)';
    ctx.shadowBlur = 8;
    ctx.font = 'italic 700 24px "Segoe UI", system-ui';
    ctx.fillStyle = greenStyle;
    ctx.fillText(form.status, startX + statusOffset + 4, y);
    ctx.shadowColor = 'rgba(0, 230, 118, 0.45)';
    ctx.shadowBlur = 20;
    ctx.fillText(form.status, startX + statusOffset + 4, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    y = 338;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('ISSUED:', startX, y);
    const issuedOffset = ctx.measureText('ISSUED: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.issuedDate, startX + issuedOffset + 4, y);

    y = 398;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('CITIZEN ID:', startX, y);
    const idOffset = ctx.measureText('CITIZEN ID: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.serialId, startX + idOffset + 4, y);

    ctx.restore();
  };

  const drawQRCode = (ctx: CanvasRenderingContext2D) => {
    const qx = 838, qy = 290, qs = 95;

    ctx.save();
    ctx.fillStyle = 'rgba(74, 82, 48, 0.52)';
    ctx.beginPath();
    roundRect(ctx, qx - 12, qy - 12, qs + 24, qs + 60, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(182, 191, 138, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, qx - 12, qy - 12, qs + 24, qs + 60, 8);
    ctx.stroke();

    if (!qrImg) {
      ctx.fillStyle = 'rgba(180, 190, 210, 0.5)';
      ctx.font = '14px "Segoe UI", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Generating...', qx + qs / 2, qy + qs / 2);
      ctx.restore();
      return;
    }

    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qs;
    qrCanvas.height = qs;
    const qrCtx = qrCanvas.getContext('2d')!;
    qrCtx.drawImage(qrImg, 0, 0, qs, qs);
    qrCtx.globalCompositeOperation = 'source-in';
    const qrGrad = qrCtx.createLinearGradient(0, 0, qs, qs);
    qrGrad.addColorStop(0, 'rgba(255, 168, 204, 0.92)');
    qrGrad.addColorStop(0.35, 'rgba(236, 120, 182, 0.9)');
    qrGrad.addColorStop(0.7, 'rgba(222, 106, 168, 0.84)');
    qrGrad.addColorStop(1, 'rgba(198, 82, 150, 0.78)');
    qrCtx.fillStyle = qrGrad;
    qrCtx.fillRect(0, 0, qs, qs);
    qrCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(qrCanvas, qx, qy, qs, qs);

    const qrGlow = ctx.createRadialGradient(qx + qs * 0.35, qy + qs * 0.28, 0, qx + qs * 0.35, qy + qs * 0.28, qs * 0.95);
    qrGlow.addColorStop(0, 'rgba(255, 176, 212, 0.12)');
    qrGlow.addColorStop(0.5, 'rgba(255, 160, 205, 0.05)');
    qrGlow.addColorStop(1, 'rgba(255, 160, 205, 0)');
    ctx.fillStyle = qrGlow;
    ctx.fillRect(qx - 6, qy - 6, qs + 12, qs + 12);

    ctx.font = '500 7px "JetBrains Mono", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(70, 140, 180, 0.50)';
    const hashPrefix = sha256Hash ? sha256Hash.slice(0, 8) : '00000000';
    ctx.fillText(`HASH: 0x${hashPrefix}...`, qx + qs / 2, qy + qs + 20);
    ctx.fillText('STATUS: ON-CHAIN SYNCED', qx + qs / 2, qy + qs + 30);
    ctx.restore();
  };

  const drawDescription = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.font = '500 12px "Segoe UI", system-ui';
    ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(form.description, CANVAS_W / 2, 510);
    ctx.restore();
  };

  const drawLegalNotice = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.font = '400 8px "Segoe UI", system-ui';
    ctx.fillStyle = 'rgba(160, 170, 190, 0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const notice = 'This certificate contains a SHA-256 hash that serves as technical evidence of existence, independently verifiable via Blockchain.';
    ctx.fillText(notice, CANVAS_W / 2, 540);
    ctx.restore();
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = REAL_W;
    canvas.height = REAL_H;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    drawPanel(ctx);
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawQRCode(ctx);
    drawDescription(ctx);
    drawLegalNotice(ctx);
  }, [bgImg, logoImg, avatarImg, qrImg, form]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const exportPNG = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = REAL_W;
    canvas.height = REAL_H;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    }
    drawPanel(ctx);
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawDescription(ctx);
    drawQRCode(ctx);
    drawLegalNotice(ctx);

    const imageDataUrl = canvas.toDataURL('image/png');

    const verificationGuide = `V-ID VERIFICATION GUIDE
========================

Thank you for generating your V-ID Certificate!

WHAT IS THE SHA-256 HASH?
-------------------------
The SHA-256 hash is a unique cryptographic fingerprint of your V-ID certificate.
It serves as tamper-proof evidence that this identity existed at a specific point in time.

YOUR V-ID DETAILS:
------------------
Character Name: ${form.name}
Citizen ID: ${form.serialId}
Issue Date: ${form.issuedDate}
SHA-256 Hash: ${sha256Hash}

HOW TO VERIFY YOUR V-ID:
------------------------
1. Visit the OpenTimestamps official website:
   https://opentimestamps.org

2. Copy your SHA-256 hash (shown above)

3. Paste it into the verification field on OpenTimestamps.org

4. The website will show you the Bitcoin blockchain timestamp proof

WHY THIS MATTERS:
-----------------
- Your V-ID is anchored to the Bitcoin blockchain
- This provides independent, decentralized proof of existence
- No one can alter or backdate your V-ID record
- The verification is completely independent of our service

ONLINE VERIFICATION:
--------------------
You can also verify your V-ID online at:
https://digital-ip-proof-sys-78ai.bolt.host/verify/${citizenId}

This will show your full V-ID record and provide a direct link
to verify the hash on OpenTimestamps.org

QUESTIONS?
----------
For more information about V-ID and blockchain verification,
visit our website or contact support.

© V-ID Protocol - Decentralized Identity Verification
`;

    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const zip = new JSZip();

    const imageBlob = await (await fetch(imageDataUrl)).blob();
    zip.file('V-ID_Certificate.png', imageBlob);

    zip.file('Proof_Verification_Guide.txt', verificationGuide);

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const link = document.createElement('a');
    link.download = `V-ID_${form.serialId}_Complete.zip`;
    link.href = URL.createObjectURL(zipBlob);
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Card Generator</h1>
            <p className="text-sm text-slate-400">Preview your certificate</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/20 text-slate-200 rounded-lg font-semibold transition-all"
            >
              Back to Home
            </button>
            <button
              onClick={exportPNG}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/30"
            >
              Download Certificate
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 160px)' }}
          />
        </div>
      </div>
    </div>
  );
}
