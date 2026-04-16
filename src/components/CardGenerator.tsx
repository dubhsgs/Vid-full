import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../utils/supabase';
import { calculateSHA256 } from '../utils/sha256';
import { uploadImageToStorage } from '../utils/imageUpload';

async function triggerOTSStamp(friendlyId: string, sha256Hash: string): Promise<void> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ots-stamp`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendly_id: friendlyId, sha256_hash: sha256Hash }),
    });
  } catch (err) {
    console.error('[OTS] Stamp request failed (non-critical):', err);
  }
}

// --- 高清渲染基准 ---
const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
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
      const creatorName = localStorage.getItem('vid_creator_name') || 'Anonymous Creator';

      setForm(prev => ({
        ...prev,
        name: savedName,
        issuedDate,
        serialId: 'Generating...',
      }));

      const serialId = generateSerialId();

      (async () => {
        try {
          setIsSaving(true);

          let imageUrl = '';
          let hashValue = '';
          const originalFileHash = localStorage.getItem('vid_original_file_hash') || '';

          if (savedAvatar) {
            console.log('[CardGenerator] Uploading thumbnail to Storage...');
            const uploadedUrl = await uploadImageToStorage(savedAvatar, `${serialId}.png`);

            if (uploadedUrl) {
              imageUrl = uploadedUrl;
              console.log('[CardGenerator] Thumbnail uploaded successfully:', imageUrl);
            } else {
              console.warn('[CardGenerator] Failed to upload thumbnail, using base64 fallback');
              imageUrl = savedAvatar;
            }

            hashValue = originalFileHash || await calculateSHA256(`${savedName}:${creatorName}:${issuedDate}:${imageUrl}`);
            setSha256Hash(hashValue);
          }

          if (!hashValue) {
            hashValue = await calculateSHA256(`${savedName}:${creatorName}:${issuedDate}:${serialId}`);
            setSha256Hash(hashValue);
          }

          const { data, error } = await supabase
            .from('v_ids')
            .insert({
              character_name: savedName,
              creator_name: creatorName,
              sha256_hash: hashValue,
              original_file_hash: originalFileHash || hashValue,
              image_url: imageUrl,
              friendly_id: serialId,
              ots_status: 'pending',
            })
            .select('friendly_id')
            .maybeSingle();

          if (error) {
            if (error.code === '23505' && error.message?.includes('sha256_hash')) {
              const { data: existing } = await supabase
                .from('v_ids')
                .select('friendly_id')
                .eq('sha256_hash', hashValue)
                .maybeSingle();
              if (existing?.friendly_id) {
                setCitizenId(existing.friendly_id);
                setForm(prev => ({
                  ...prev,
                  serialId: existing.friendly_id,
                  qrContent: `https://vaid.top/verify/${existing.friendly_id}`,
                }));
                localStorage.removeItem('vid_original_file_hash');
                return;
              }
            }
            console.error('Error saving to database:', error);
            setCitizenId(serialId);
            setForm(prev => ({
              ...prev,
              serialId: serialId,
              qrContent: `https://vaid.top/verify/${serialId}`,
            }));
          } else if (data) {
            console.log('Successfully saved to database, friendly_id:', data.friendly_id);
            setCitizenId(data.friendly_id);
            setForm(prev => ({
              ...prev,
              serialId: data.friendly_id,
              qrContent: `https://vaid.top/verify/${data.friendly_id}`,
            }));
            triggerOTSStamp(data.friendly_id, hashValue);
            localStorage.removeItem('vid_original_file_hash');
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
            qrContent: `https://vaid.top/verify/${serialId}`,
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
          loadImage('/vaid_logo透明.png'),
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
        ? `https://vaid.top/verify/${citizenId}`
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
    // 【核心修复：卡片宽度缩小至 880，留出左右背景空间，对齐参考图宽窄】
    const pw = 880;
    const ph = 494; // 16:9 内部比例
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;
    const r = 32;   // 圆角加大
    if (bgImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, r);
      ctx.clip();
      ctx.filter = 'blur(10px) brightness(0.9) saturate(1.08)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.filter = 'none';
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.34)';
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
    ctx.strokeStyle = 'rgba(225, 235, 255, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(140, 180, 255, 0.18)';
    ctx.shadowBlur = 32;
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.restore();
  };

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    if (!logoImg) return;
    const logoH = 86;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    const lx = (CANVAS_W - logoW) / 2;
    const ly = 32;
    ctx.drawImage(logoImg, lx, ly, logoW, logoH);
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D) => {
    // 【核心修复：平衡后的坐标与半径】
    const cx = 270, cy = 305, outerR = 175, innerR = 160;

    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy + 10, innerR - 5, cx, cy + 10, outerR + 24);
    glow.addColorStop(0, hexToRgba(AVATAR_COLOR_END, 0));
    glow.addColorStop(0.5, hexToRgba(AVATAR_COLOR_END, 0.12));
    glow.addColorStop(0.8, hexToRgba(AVATAR_COLOR_START, 0.08));
    glow.addColorStop(1, hexToRgba(AVATAR_COLOR_START, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 24, 0, Math.PI * 2);
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

    // 【高清重采样修复：解决头像模糊】
    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
      ctx.clip();
      
      const imgW = avatarImg.width, imgH = avatarImg.height;
      const minSide = Math.min(imgW, imgH);
      const sx = (imgW - minSide) / 2, sy = (imgH - minSide) / 2;
      const targetSize = (innerR - 2) * 2;
      
      ctx.drawImage(
        avatarImg,
        sx, sy, minSide, minSide,
        cx - innerR + 2, cy - innerR + 2,
        targetSize, targetSize
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
    const lx = 485, ly1 = 170, ly2 = 450;
    ctx.save();
    const glow = ctx.createLinearGradient(lx - 8, ly1, lx + 8, ly1);
    glow.addColorStop(0, 'rgba(160, 190, 240, 0)');
    glow.addColorStop(0.5, 'rgba(160, 190, 240, 0.16)');
    glow.addColorStop(1, 'rgba(160, 190, 240, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 8, ly1, 16, ly2 - ly1);

    const core = ctx.createLinearGradient(lx - 1.5, ly1, lx + 1.5, ly1);
    core.addColorStop(0.5, 'rgba(210, 225, 255, 0.55)');
    ctx.fillStyle = core;
    ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
    ctx.restore();
  };

  const drawTextFields = (ctx: CanvasRenderingContext2D) => {
    const startX = 525;
    const labelStyle = 'rgba(180, 190, 210, 0.70)';
    const valueStyle = '#ffffff';

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 收紧行距对齐右图扁平感
    let y = 195;
    ctx.font = '500 22px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('NAME:', startX, y);
    ctx.font = '700 22px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.name, startX + 90, y);

    y = 265;
    ctx.font = '500 22px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('STATUS:', startX, y);
    ctx.font = 'italic 700 22px "Segoe UI", system-ui';
    ctx.fillStyle = '#00e676';
    ctx.shadowBlur = 10; ctx.shadowColor = '#00e676';
    ctx.fillText(form.status, startX + 105, y);
    ctx.shadowBlur = 0;

    y = 335;
    ctx.font = '500 22px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('ISSUED:', startX, y);
    ctx.font = '700 22px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.issuedDate, startX + 95, y);

    y = 405;
    ctx.font = '500 22px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('CITIZEN ID:', startX, y);
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.serialId, startX + 135, y);
    ctx.restore();
  };

  const drawQRCode = (ctx: CanvasRenderingContext2D) => {
    const qx = 835, qy = 294, qs = 84;
    ctx.save();
    ctx.fillStyle = 'rgba(60, 66, 40, 0.50)';
    ctx.beginPath();
    roundRect(ctx, qx - 6, qy - 6, qs + 12, qs + 40, 7);
    ctx.fill();

    if (qrImg) {
      ctx.drawImage(qrImg, qx, qy, qs, qs);
    }

    ctx.font = '500 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(210, 215, 200, 0.72)';
    ctx.fillText(`TOKEN: ${form.qrToken}`, qx + qs / 2, qy + qs + 12);
    ctx.restore();
  };

  const drawDescription = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.font = '500 12px "Segoe UI", system-ui';
    ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(form.description, CANVAS_W / 2, 514);
    ctx.restore();
  };

  const drawCanvas = useCallback(() => {
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
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawQRCode(ctx);
    drawDescription(ctx);
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

4. The website will show you the timestamp proof

WHY THIS MATTERS:
-----------------
- Your V-ID is anchored to digital identity technology
- This provides independent, decentralized proof of existence
- No one can alter or backdate your V-ID record
- The verification is completely independent of our service

ONLINE VERIFICATION:
--------------------
You can also verify your V-ID online at:
https://vaid.top/verify/${citizenId}

This will show your full V-ID record and provide a direct link
to verify the hash on OpenTimestamps.org

QUESTIONS?
----------
For more information about V-ID and digital identity verification,
visit our website or contact support.

© V-ID Protocol - Decentralized Identity Verification
`;

    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const zip = new JSZip();

    const imageBlob = await (await fetch(imageDataUrl)).blob();
    zip.file('V-ID_Certificate.png', imageBlob);
    zip.file('Proof_Verification_Guide.txt', verificationGuide);

    if (citizenId) {
      const { data: otsData } = await supabase.storage
        .from('v-id-images')
        .download(`ots/${citizenId}.ots`);
      if (otsData) {
        zip.file(`${citizenId}.ots`, otsData);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `V-ID_${form.serialId}_Complete.zip`;
    link.href = URL.createObjectURL(zipBlob);
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white flex flex-col items-center">
      <div className="max-w-[1200px] w-full p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Identity Preview</h1>
        <div className="flex gap-4">
          <button onClick={() => navigate('/')} className="px-5 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all">Back</button>
          <button onClick={exportPNG} className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">Download</button>
        </div>
      </div>
      <canvas ref={canvasRef} className="rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]" />
      <p className="mt-6 text-slate-500 text-xs text-center max-w-md leading-relaxed">
        * PROOF OF IDENTITY ANCHORED ON V-ID LEDGER
      </p>
    </div>
  );
}