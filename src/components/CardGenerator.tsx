import { useState, useEffect, useCallback } from 'react';
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

const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = 2;
const REAL_W = CANVAS_W * DPR;
const REAL_H = CANVAS_H * DPR;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';

interface FormData {
  name: string;
  status: string;
  issuedDate: string;
  serialId: string;
  description: string;
  qrContent: string;
}

export function CardGenerator() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: 'ELIZA REED',
    status: 'VERIFIED',
    issuedDate: '',
    serialId: '',
    description: 'THIS DOCUMENT CONSTITUTES FINAL PROOF OF A UNIQUE DIGITAL IDENTITY ANCHORED ON THE IMMUTABLE V-ID LEDGER.',
    qrContent: '',
  });

  const [sha256Hash, setSha256Hash] = useState<string>('');
  const [citizenId, setCitizenId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

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
    const savedAvatar = localStorage.getItem('vid_uploaded_avatar');
    if (savedAvatar) setAvatarUrl(savedAvatar);

    const initializeCard = async () => {
      const issuedDate = formatIssuedDate();
      const savedName = localStorage.getItem('vid_character_name') || 'ELIZA REED';
      const creatorName = localStorage.getItem('vid_creator_name') || 'Anonymous Creator';

      setForm(prev => ({
        ...prev,
        name: savedName,
        issuedDate,
        serialId: 'Generating...',
      }));

      const serialId = generateSerialId();

      try {
        setIsSaving(true);

        let imageUrl = '';
        let hashValue = '';
        const originalFileHash = localStorage.getItem('vid_original_file_hash') || '';

        if (savedAvatar) {
          const uploadedUrl = await uploadImageToStorage(savedAvatar, `${serialId}.png`);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          } else {
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
          setCitizenId(serialId);
          setForm(prev => ({
            ...prev,
            serialId: serialId,
            qrContent: `https://vaid.top/verify/${serialId}`,
          }));
        } else if (data) {
          setCitizenId(data.friendly_id);
          setForm(prev => ({
            ...prev,
            serialId: data.friendly_id,
            qrContent: `https://vaid.top/verify/${data.friendly_id}`,
          }));
          triggerOTSStamp(data.friendly_id, hashValue);
          localStorage.removeItem('vid_original_file_hash');
        } else {
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
    };

    initializeCard();
  }, [formatIssuedDate, generateSerialId]);

  useEffect(() => {
    const verifyUrl = citizenId
      ? `https://vaid.top/verify/${citizenId}`
      : 'https://vaid.top';

    QRCode.toDataURL(verifyUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#de6aa8', light: '#00000000' },
      errorCorrectionLevel: 'M',
    }).then(url => setQrDataUrl(url)).catch(console.error);
  }, [citizenId]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

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
      sh = img.height; sw = sh * boxRatio; sx = (img.width - sw) / 2; sy = 0;
    } else {
      sw = img.width; sh = sw / boxRatio; sx = 0; sy = (img.height - sh) / 2;
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

  const exportPNG = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = REAL_W;
    canvas.height = REAL_H;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    const bgImg = await loadImg('/bg.jpg').catch(() => null);
    const logoImg = await loadImg('/logo.png').catch(() => null);
    const avatarImg = avatarUrl ? await loadImg(avatarUrl).catch(() => null) : null;
    const qrImg = qrDataUrl ? await loadImg(qrDataUrl).catch(() => null) : null;

    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    const px = 45, py = 28, pw = 934, ph = 520, r = 18;
    if (bgImg) {
      ctx.save();
      ctx.beginPath(); roundRect(ctx, px, py, pw, ph, r); ctx.clip();
      ctx.filter = 'blur(3px) brightness(0.92)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.filter = 'none';
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); roundRect(ctx, px, py, pw, ph, r);
    ctx.fillStyle = 'rgba(18, 22, 34, 0.14)'; ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(200, 215, 240, 0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    if (logoImg) {
      const logoH = 60;
      const logoW = (logoImg.width / logoImg.height) * logoH;
      ctx.drawImage(logoImg, (CANVAS_W - logoW) / 2, 45, logoW, logoH);
      ctx.save();
      ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(200, 210, 230, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('V-ID Protocol', CANVAS_W / 2, 45 + logoH + 18);
      ctx.restore();
    }

    const cx = 210, cy = 310, outerR = 100, innerR = 88;
    ctx.save();
    const ringGrad = ctx.createLinearGradient(cx, cy - outerR, cx, cy + outerR);
    ringGrad.addColorStop(0, AVATAR_COLOR_START);
    ringGrad.addColorStop(0.65, AVATAR_COLOR_END);
    ringGrad.addColorStop(1, AVATAR_COLOR_END);
    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 18, 30, 0.8)'; ctx.fill();
    if (avatarImg) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.clip();
      const size = innerR * 2 - 4;
      const { sx: asx, sy: asy, sw: asw, sh: ash } = (() => {
        const ir = avatarImg.width / avatarImg.height;
        const br = 1;
        if (ir > br) { const sh = avatarImg.height; const sw = sh * br; return { sx: (avatarImg.width - sw) / 2, sy: 0, sw, sh }; }
        else { const sw = avatarImg.width; const sh = sw / br; return { sx: 0, sy: (avatarImg.height - sh) / 2, sw, sh }; }
      })();
      ctx.drawImage(avatarImg, asx, asy, asw, ash, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();

    const lx = 340, ly1 = 170, ly2 = 455;
    ctx.save();
    const core = ctx.createLinearGradient(lx - 1.5, ly1, lx + 1.5, ly1);
    core.addColorStop(0, 'rgba(210, 225, 255, 0.18)');
    core.addColorStop(0.5, 'rgba(210, 225, 255, 0.55)');
    core.addColorStop(1, 'rgba(210, 225, 255, 0.18)');
    ctx.fillStyle = core; ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
    ctx.restore();

    const startX = 370;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '500 16px "Segoe UI", system-ui'; ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
    ctx.fillText('NAME:', startX, 215);
    const nameOff = ctx.measureText('NAME: ').width;
    ctx.font = '700 30px "Segoe UI", system-ui'; ctx.fillStyle = '#ffffff';
    ctx.fillText(form.name, startX + nameOff + 4, 215);
    ctx.font = '500 16px "Segoe UI", system-ui'; ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
    ctx.fillText('STATUS:', startX, 278);
    const statusOff = ctx.measureText('STATUS: ').width;
    ctx.shadowColor = 'rgba(0, 230, 118, 0.95)'; ctx.shadowBlur = 8;
    ctx.font = 'italic 700 24px "Segoe UI", system-ui'; ctx.fillStyle = '#00e676';
    ctx.fillText(form.status, startX + statusOff + 4, 278);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.font = '500 16px "Segoe UI", system-ui'; ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
    ctx.fillText('ISSUED:', startX, 338);
    const issuedOff = ctx.measureText('ISSUED: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui'; ctx.fillStyle = '#ffffff';
    ctx.fillText(form.issuedDate, startX + issuedOff + 4, 338);
    ctx.font = '500 16px "Segoe UI", system-ui'; ctx.fillStyle = 'rgba(180, 190, 210, 0.7)';
    ctx.fillText('CITIZEN ID:', startX, 398);
    const idOff = ctx.measureText('CITIZEN ID: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui'; ctx.fillStyle = '#ffffff';
    ctx.fillText(form.serialId, startX + idOff + 4, 398);
    ctx.restore();

    if (qrImg) {
      const qx = 838, qy = 290, qs = 95;
      ctx.save();
      ctx.fillStyle = 'rgba(74, 82, 48, 0.52)';
      ctx.beginPath(); roundRect(ctx, qx - 12, qy - 12, qs + 24, qs + 60, 8); ctx.fill();
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = qs; qrCanvas.height = qs;
      const qrCtx = qrCanvas.getContext('2d')!;
      qrCtx.drawImage(qrImg, 0, 0, qs, qs);
      qrCtx.globalCompositeOperation = 'source-in';
      const qrGrad = qrCtx.createLinearGradient(0, 0, qs, qs);
      qrGrad.addColorStop(0, 'rgba(255, 168, 204, 0.92)');
      qrGrad.addColorStop(1, 'rgba(198, 82, 150, 0.78)');
      qrCtx.fillStyle = qrGrad; qrCtx.fillRect(0, 0, qs, qs);
      ctx.drawImage(qrCanvas, qx, qy, qs, qs);
      ctx.font = '500 7px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(70, 140, 180, 0.50)';
      const hashPrefix = sha256Hash ? sha256Hash.slice(0, 8) : '00000000';
      ctx.fillText(`HASH: 0x${hashPrefix}...`, qx + qs / 2, qy + qs + 20);
      ctx.fillText('STATUS: ON-CHAIN SYNCED', qx + qs / 2, qy + qs + 30);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '500 12px "Segoe UI", system-ui'; ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(form.description, CANVAS_W / 2, 510);
    ctx.restore();

    const imageDataUrl = canvas.toDataURL('image/png');

    const verificationGuide = `V-ID VERIFICATION GUIDE
========================

YOUR V-ID DETAILS:
------------------
Character Name: ${form.name}
Citizen ID: ${form.serialId}
Issue Date: ${form.issuedDate}
SHA-256 Hash: ${sha256Hash}

HOW TO VERIFY YOUR V-ID:
------------------------
1. Visit: https://opentimestamps.org
2. Copy your SHA-256 hash (shown above)
3. Paste it into the verification field

ONLINE VERIFICATION:
--------------------
https://vaid.top/verify/${citizenId}

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
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
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
              disabled={isSaving || !form.serialId || form.serialId === 'Generating...'}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/30"
            >
              {isSaving ? 'Saving...' : 'Download Certificate'}
            </button>
          </div>
        </div>

        <CertificateCard form={form} avatarUrl={avatarUrl} qrDataUrl={qrDataUrl} sha256Hash={sha256Hash} />

        <p className="mt-4 text-xs text-slate-500 text-center max-w-lg mx-auto leading-relaxed">
          我们仅存储您的指纹证明与等比缩小的预览图，请妥善保管原图文件。
        </p>
      </div>
    </div>
  );
}

interface CertificateCardProps {
  form: FormData;
  avatarUrl: string;
  qrDataUrl: string;
  sha256Hash: string;
}

function CertificateCard({ form, avatarUrl, qrDataUrl, sha256Hash }: CertificateCardProps) {
  return (
    <div className="w-full" style={{ aspectRatio: '16/9', maxHeight: 'calc(100vh - 200px)' }}>
      <div
        className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'url(/bg.jpg) center/cover no-repeat',
        }}
      >
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(3px) brightness(0.92)', background: 'rgba(0,0,0,0.15)' }} />

        <div
          className="absolute rounded-2xl overflow-hidden"
          style={{
            inset: '4.8% 4.5%',
            border: '1.5px solid rgba(200,215,240,0.35)',
            background: 'rgba(18,22,34,0.14)',
            boxShadow: '0 0 40px rgba(140,180,255,0.08)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 0% 0%, rgba(210,230,255,0.14) 0%, transparent 30%),
                radial-gradient(circle at 100% 0%, rgba(210,230,255,0.14) 0%, transparent 30%),
                radial-gradient(circle at 0% 100%, rgba(210,230,255,0.14) 0%, transparent 30%),
                radial-gradient(circle at 100% 100%, rgba(210,230,255,0.14) 0%, transparent 30%)
              `,
            }}
          />
        </div>

        <div className="absolute inset-0 flex flex-col">
          <div className="flex justify-center pt-[5%]">
            <div className="flex flex-col items-center">
              <img src="/logo.png" alt="V-ID Logo" className="h-[8%] max-h-12 w-auto object-contain" style={{ height: 'clamp(28px, 5vh, 48px)' }} />
              <span className="text-[clamp(8px,1.2vw,12px)] text-slate-300/70 font-semibold tracking-wider mt-1">V-ID Protocol</span>
            </div>
          </div>

          <div className="flex-1 flex items-center px-[5%] gap-[3%]">
            <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 'clamp(80px, 18%, 160px)' }}>
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: 'clamp(80px, 18vw, 160px)',
                  height: 'clamp(80px, 18vw, 160px)',
                  padding: '3px',
                  background: `linear-gradient(180deg, ${AVATAR_COLOR_START} 0%, ${AVATAR_COLOR_START} 45%, ${AVATAR_COLOR_END} 65%, ${AVATAR_COLOR_END} 100%)`,
                  boxShadow: `0 0 20px ${hexToRgba(AVATAR_COLOR_END, 0.25)}`,
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[rgba(15,18,30,0.8)]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-4xl">?</div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex-shrink-0 self-stretch"
              style={{
                width: '1.5px',
                margin: '8% 0',
                background: 'linear-gradient(to bottom, transparent, rgba(210,225,255,0.55), transparent)',
              }}
            />

            <div className="flex-1 flex flex-col justify-center gap-[4%] min-w-0 py-[2%]">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[clamp(9px,1vw,14px)] text-slate-400 font-medium whitespace-nowrap">NAME:</span>
                <span className="text-[clamp(14px,2.2vw,28px)] font-bold text-white truncate">{form.name}</span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[clamp(9px,1vw,14px)] text-slate-400 font-medium whitespace-nowrap">STATUS:</span>
                <span
                  className="text-[clamp(12px,1.8vw,22px)] font-bold italic"
                  style={{ color: '#00e676', textShadow: '0 0 10px rgba(0,230,118,0.7)' }}
                >
                  {form.status}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[clamp(9px,1vw,14px)] text-slate-400 font-medium whitespace-nowrap">ISSUED:</span>
                <span className="text-[clamp(11px,1.6vw,20px)] font-bold text-white">{form.issuedDate}</span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[clamp(9px,1vw,14px)] text-slate-400 font-medium whitespace-nowrap">CITIZEN ID:</span>
                <span className="text-[clamp(11px,1.6vw,20px)] font-bold text-white truncate">{form.serialId}</span>
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-col items-center gap-1" style={{ width: 'clamp(60px, 12%, 110px)' }}>
              <div
                className="rounded-lg overflow-hidden p-2"
                style={{
                  background: 'rgba(74,82,48,0.52)',
                  border: '1px solid rgba(182,191,138,0.22)',
                  width: 'clamp(60px, 12vw, 110px)',
                  aspectRatio: '1',
                }}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full" style={{ objectFit: 'contain' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">QR</div>
                )}
              </div>
              <span className="text-[clamp(6px,0.7vw,9px)] text-blue-400/60 text-center font-mono leading-tight">
                {sha256Hash ? `0x${sha256Hash.slice(0, 8)}...` : ''}
              </span>
              <span className="text-[clamp(5px,0.65vw,8px)] text-blue-400/50 text-center font-mono">ON-CHAIN SYNCED</span>
            </div>
          </div>

          <div className="text-center pb-[2%]">
            <p className="text-[clamp(7px,0.9vw,11px)] text-slate-400/50 px-4">{form.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha = 1) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
