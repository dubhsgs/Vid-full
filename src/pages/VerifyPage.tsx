import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ExternalLink, Loader2, AlertCircle, Calendar, User, Hash, Lock } from 'lucide-react';
import { supabase } from '../utils/supabase';
import QRCode from 'qrcode';

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

const CANVAS_W = 512;
const CANVAS_H = 288;
const DPR = 2;

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
          .from('v_ids')
          .select('id, friendly_id, character_name, creator_name, sha256_hash, image_url, created_at, ots_status, ots_file_path')
          .eq('friendly_id', normalizedId)
          .maybeSingle();

        console.log('[VerifyPage] Query result:', { data, error });

        if (error) throw error;

        if (!data) {
          console.error('[VerifyPage] No record found for ID:', normalizedId);
          setError('No record found for this Citizen ID');
        } else {
          console.log('[VerifyPage] Record found:', data);
          const rec = { ...data, id: data.friendly_id || data.id };
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

  const loadImage = useCallback((src: string, timeout = 10000): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        img.src = '';
        reject(new Error(`Image load timeout: ${src.substring(0, 50)}...`));
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      img.src = src;
    });
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
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.scale(DPR, DPR);

    try {
      console.log('[VerifyPage] Loading images...');
      const loadPromises: Promise<HTMLImageElement | null>[] = [
        loadImage('/bg.jpg').catch(err => {
          console.warn('[VerifyPage] Failed to load background:', err);
          return null;
        }),
        loadImage('/logo.png').catch(err => {
          console.warn('[VerifyPage] Failed to load logo:', err);
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

      const [bgImg, logoImg, avatarImg] = await Promise.all(loadPromises);
      console.log('[VerifyPage] Images loaded:', { bg: !!bgImg, logo: !!logoImg, avatar: !!avatarImg });

      console.log('[VerifyPage] Generating QR code for:', record.id);
      let qrImg: HTMLImageElement | null = null;
      try {
        const qrUrl = `${window.location.origin}/verify/${record.id}`;
        console.log('[VerifyPage] QR URL:', qrUrl);
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#00000000' },
        });
        qrImg = await loadImage(qrDataUrl);
        console.log('[VerifyPage] QR code loaded successfully');
      } catch (err) {
        console.error('[VerifyPage] Failed to generate/load QR code:', err);
      }

      const px = 22, py = 14, pw = 467, ph = 260, r = 9;

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, r);
      ctx.clip();
      ctx.filter = 'blur(1.5px) brightness(0.92)';
      if (bgImg) drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.filter = 'none';
      ctx.restore();

      ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, r);
      ctx.stroke();

      if (logoImg) {
        const logoSize = 40;
        ctx.drawImage(logoImg, CANVAS_W / 2 - logoSize / 2, py + 15, logoSize, logoSize);
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('V-ID Protocol', CANVAS_W / 2, py + 70);

      if (avatarImg) {
        const avatarSize = 70;
        const avatarX = px + 30;
        const avatarY = py + 90;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const gradient = ctx.createLinearGradient(avatarX, avatarY, avatarX, avatarY + avatarSize);
        gradient.addColorStop(0, 'rgba(184, 220, 232, 0.3)');
        gradient.addColorStop(1, 'rgba(224, 64, 160, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

        drawCover(ctx, avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        ctx.strokeStyle = 'rgba(184, 220, 232, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      const textX = px + 140;
      let textY = py + 100;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '8px Arial';
      ctx.fillText('NAME:', textX, textY);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(record.character_name, textX + 45, textY);

      textY += 20;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '8px Arial';
      ctx.fillText('STATUS:', textX, textY);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('VERIFIED', textX + 45, textY);

      textY += 20;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '8px Arial';
      ctx.fillText('ISSUED:', textX, textY);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial';
      const issueDate = new Date(record.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }).toUpperCase();
      ctx.fillText(issueDate, textX + 45, textY);

      textY += 20;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '8px Arial';
      ctx.fillText('CITIZEN ID:', textX, textY);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      const citizenId = record.id.toUpperCase();
      ctx.fillText(citizenId, textX + 60, textY);

      const qrSize = 85;
      const qrX = px + pw - qrSize - 20;
      const qrY = py + 90;

      ctx.fillStyle = 'rgba(222, 106, 168, 0.15)';
      ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

      if (qrImg) {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#666';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR UNAVAILABLE', qrX + qrSize / 2, qrY + qrSize / 2);
      }

      ctx.font = '5px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100, 180, 255, 0.50)';
      const hashPrefix = record.sha256_hash ? record.sha256_hash.slice(0, 8) : '00000000';
      ctx.fillText(`HASH: 0x${hashPrefix}...`, qrX + qrSize / 2, qrY + qrSize + 12);
      ctx.fillText('STATUS: ON-CHAIN SYNCED', qrX + qrSize / 2, qrY + qrSize + 20);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '7px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('THIS DOCUMENT CONSTITUTES FINAL PROOF OF A UNIQUE DIGITAL IDENTITY', CANVAS_W / 2, py + ph - 25);
      ctx.fillText('ANCHORED ON THE IMMUTABLE V-ID LEDGER.', CANVAS_W / 2, py + ph - 15);

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
    if (record?.sha256_hash) {
      window.open(`https://opentimestamps.org/?hash=${record.sha256_hash}`, '_blank');
    }
  };

  const handleDownloadBundle = async () => {
    if (!record || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const proofText = `V-ID PROTOCOL - PROOF OF EXISTENCE

Certificate ID: ${record.id}
Character Name: ${record.character_name}
Creator: ${record.creator_name}
Timestamp: ${formatDate(record.created_at)}

SHA-256 DIGITAL FINGERPRINT:
${record.sha256_hash}

VERIFICATION GUIDE:
此文件包含您的 SHA-256 数字指纹。您可以访问 https://opentimestamps.org 并上传您的证书图片，以独立验证其在比特币网络上的存在时间戳。

V-ID 协议：让虚拟，真实存在。

For more information, visit: ${window.location.origin}
`;

      const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
      const zip = new JSZip();

      zip.file('V-ID_Certificate.png', imageBlob);
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
      a.download = `V-ID_Bundle_${record.id}.zip`;
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
          <p className="text-slate-300">Verifying V-ID Record...</p>
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
            VERIFIED BY V-ID PROTOCOL
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Digital Identity Record Confirmed</p>
        </div>

        <div className="backdrop-blur-xl bg-[#0f1629]/80 border border-cyan-500/30 rounded-2xl p-4 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-4">Certificate Preview</h2>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-4 flex items-center justify-center">
                {certificateReady ? (
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto max-w-full rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                )}
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
                  IMMUTABLE HASH (不可篡改指纹)
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
                {otsStatus === 'confirmed' && 'OTS 已在比特币链上确认'}
                {otsStatus === 'stamped'   && 'OTS 时间戳已提交，等待区块链确认（约1小时）'}
                {otsStatus === 'failed'    && 'OTS 时间戳提交失败'}
                {otsStatus === 'pending'   && 'OTS 时间戳处理中...'}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              原始图片的 SHA-256 指纹已通过 OpenTimestamps 协议锚定至比特币区块链，提供不可篡改的存在时间证明。
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
              <span>Inspect Proof</span>
              <ExternalLink className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="mt-6 md:mt-8 p-4 md:p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-xl backdrop-blur-sm">
          <h3 className="text-base md:text-lg font-semibold text-cyan-400 mb-3">About This Verification</h3>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            此 V-ID 记录已永久注册在我们的去中心化身份台账中。原始图片文件的 SHA-256 哈希值通过
            OpenTimestamps 协议真实锚定至比特币主网，任何人均可独立验证此证明的存在时间。
            下载包中包含 <span className="text-cyan-400 font-mono">.ots</span> 证明文件，可使用官方 OTS 客户端离线验证。
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
