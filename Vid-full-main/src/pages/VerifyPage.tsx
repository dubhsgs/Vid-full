import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, AlertCircle, Calendar, User, Hash, Lock, Home, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
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

const verifyCopy = {
  en: {
    loading: 'Verifying VAID Record...',
    failedTitle: 'Verification Failed',
    returnHome: 'Return to Home',
    home: 'Home',
    kicker: 'VAID // PUBLIC VERIFICATION',
    title: 'VAID Verification Record',
    subtitle: 'Digital identity archive confirmed',
    preview: 'Certificate Preview',
    metadata: 'Identity Metadata',
    characterName: 'Character Name',
    creator: 'Creator Name',
    citizenId: 'Citizen ID',
    timestamp: 'Timestamp',
    digitalSeal: 'VAID Digital Seal',
    sealDescription: 'This digital seal has entered VAID chain-based time anchoring, forming traceable and tamper-resistant proof of existence.',
    download: 'Download Bundle',
    proofStatus: 'Proof Status',
    aboutTitle: 'About This Verification',
    aboutText: 'This VAID record is part of the VAID digital identity archive. The system creates a unique digital seal for the original work and connects it to a blockchain-based time anchor, helping prove that this digital identity existed at a specific moment and remains traceable, verifiable, and tamper-resistant.',
    status: {
      confirmed: 'Blockchain archive confirmed',
      stamped: 'VAID digital seal active, archive in progress',
      failed: 'Chain archive submission failed',
      pending: 'VAID archive running in the background',
    },
    alert: {
      confirmed: 'Blockchain archive confirmed. This VAID digital seal has been confirmed by the blockchain network.',
      stamped: 'VAID digital seal is active. Chain archive confirmation is running in the background and will update automatically when completed.',
      failed: 'Chain archive submission failed. Please try again later or contact VAID.',
      pending: 'VAID archive is running in the background. The verification record is already available and the archive status will update after completion.',
    },
  },
  zh: {
    loading: '正在验证 VAID 记录...',
    failedTitle: '验证失败',
    returnHome: '返回首页',
    home: '首页',
    kicker: 'VAID // 公开验证协议',
    title: 'VAID 验证记录',
    subtitle: '数字身份档案已确认',
    preview: '证书预览',
    metadata: '身份元数据',
    characterName: '角色名称',
    creator: '创作者名称',
    citizenId: '公民编号',
    timestamp: '生成时间',
    digitalSeal: 'VAID 数字存证印记',
    sealDescription: '此数字存证印记已进入 VAID 的链上时间锚定流程，用于形成不可篡改、可追溯的存在证明。',
    download: '下载证书包',
    proofStatus: '存证状态',
    aboutTitle: '关于此验证',
    aboutText: '此 VAID 记录已写入 VAID 的数字身份存证体系，并生成公开可验证的证书档案。系统会为原始作品生成唯一的数字存证印记，并将其接入区块链时间锚定流程，用于证明该数字身份在特定时间已经存在，且后续记录可追溯、可核验、不可随意篡改。',
    status: {
      confirmed: '链上存证已确认',
      stamped: 'VAID 数字印记已生效，链上归档进行中',
      failed: '链上存证提交失败',
      pending: 'VAID 存证归档后台处理中',
    },
    alert: {
      confirmed: '链上存证已确认。此 VAID 的数字存证印记已获得区块链网络确认。',
      stamped: 'VAID 数字存证印记已生效。链上归档确认会在后台继续完成，完成后验证页状态会自动更新。',
      failed: '链上存证提交失败。请稍后重试或联系 VAID。',
      pending: 'VAID 存证归档正在后台处理中。当前验证记录已经可用，归档完成后状态会自动更新。',
    },
  },
  ja: {
    loading: 'VAID レコードを検証中...',
    failedTitle: '検証に失敗しました',
    returnHome: 'ホームへ戻る',
    home: 'ホーム',
    kicker: 'VAID // 公開検証プロトコル',
    title: 'VAID 検証レコード',
    subtitle: 'デジタルアイデンティティの記録を確認済み',
    preview: '証明書プレビュー',
    metadata: 'アイデンティティ情報',
    characterName: 'キャラクター名',
    creator: 'クリエイター名',
    citizenId: 'シチズン ID',
    timestamp: '発行日時',
    digitalSeal: 'VAID デジタル証明シール',
    sealDescription: 'このデジタル証明シールは、VAID のチェーンベース時間アンカー処理に入り、追跡可能で改ざん耐性のある存在証明を形成します。',
    download: '証明書パッケージをダウンロード',
    proofStatus: '証明ステータス',
    aboutTitle: 'この検証について',
    aboutText: 'この VAID レコードは、VAID のデジタルアイデンティティアーカイブに記録されています。システムは原作品に固有のデジタル証明シールを生成し、ブロックチェーンベースの時間アンカーへ接続することで、このデジタルアイデンティティが特定の時点で存在していたことを示し、追跡・検証・改ざん耐性を高めます。',
    status: {
      confirmed: 'チェーンアーカイブ確認済み',
      stamped: 'VAID デジタルシール有効、アーカイブ進行中',
      failed: 'チェーンアーカイブ送信失敗',
      pending: 'VAID アーカイブをバックグラウンド処理中',
    },
    alert: {
      confirmed: 'チェーンアーカイブ確認済み。この VAID デジタル証明シールはブロックチェーンネットワークで確認されています。',
      stamped: 'VAID デジタル証明シールは有効です。チェーンアーカイブ確認はバックグラウンドで継続され、完了後に状態が更新されます。',
      failed: 'チェーンアーカイブ送信に失敗しました。時間をおいて再試行するか、VAID にお問い合わせください。',
      pending: 'VAID アーカイブはバックグラウンドで処理中です。検証レコードはすでに利用可能で、完了後に状態が更新されます。',
    },
  },
};

const verifyTypography = {
  en: {
    metaLabelBox: 'w-[118px] sm:w-[150px]',
    metaLabel: 'text-[0.7rem] tracking-[0.18em]',
    metaValue: 'text-[0.95rem]',
    metaValueLong: 'text-[0.95rem]',
    proofLabel: 'text-[0.74rem] tracking-[0.18em]',
    proofTitle: 'text-[1rem]',
    proofText: 'text-[0.84rem]',
    aboutTitle: 'text-[1.55rem] tracking-[0.1em]',
    aboutText: 'text-[1.08rem] leading-10',
  },
  zh: {
    metaLabelBox: 'w-[100px]',
    metaLabel: 'text-[0.82rem] tracking-[0.06em]',
    metaValue: 'text-[1.04rem]',
    metaValueLong: 'text-[1.04rem]',
    proofLabel: 'text-[0.82rem] tracking-[0.06em]',
    proofTitle: 'text-[1.05rem]',
    proofText: 'text-[0.9rem]',
    aboutTitle: 'text-[1.62rem] tracking-[0.08em]',
    aboutText: 'text-[1.05rem] leading-9',
  },
  ja: {
    metaLabelBox: 'w-[124px]',
    metaLabel: 'text-[0.76rem] tracking-[0.03em]',
    metaValue: 'text-[0.98rem]',
    metaValueLong: 'text-[0.98rem]',
    proofLabel: 'text-[0.76rem] tracking-[0.03em]',
    proofTitle: 'text-[0.98rem]',
    proofText: 'text-[0.82rem]',
    aboutTitle: 'text-[1.42rem] tracking-[0.07em]',
    aboutText: 'text-[0.98rem] leading-9',
  },
};

export function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [record, setRecord] = useState<VIDRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificateReady, setCertificateReady] = useState(false);
  const [otsStatus, setOtsStatus] = useState<string>('pending');
  const langKey = i18n.language?.startsWith('zh') ? 'zh' : i18n.language?.startsWith('ja') ? 'ja' : 'en';
  const copy = verifyCopy[langKey];
  const type = verifyTypography[langKey];

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
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    if (langKey === 'en') {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
      return `${monthName} ${day}, ${year}, ${hour}:${minute}`;
    }

    return `${year}/${String(month + 1).padStart(2, '0')}/${day} ${hour}:${minute}`;
  };

  const handleInspectProof = () => {
    const statusText =
      otsStatus === 'confirmed'
        ? copy.alert.confirmed
        : otsStatus === 'stamped'
          ? copy.alert.stamped
          : otsStatus === 'failed'
            ? copy.alert.failed
            : copy.alert.pending;

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

  const statusLabel =
    otsStatus === 'confirmed' ? copy.status.confirmed :
    otsStatus === 'stamped' ? copy.status.stamped :
    otsStatus === 'failed' ? copy.status.failed :
    copy.status.pending;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050817] text-white flex items-center justify-center">
        <div className="text-center rounded-2xl border border-cyan-300/20 bg-slate-950/70 px-10 py-9 shadow-[0_0_60px_rgba(14,165,233,0.18)]">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#050817] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#101528]/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{copy.failedTitle}</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all"
            >
              {copy.returnHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-[#030713]">
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

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 pb-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#4b7899]/35 py-5">
          <button onClick={() => navigate('/')} className="shrink-0">
            <img
              src="/vaid-logo-top.png"
              alt="VAID Logo"
              className="h-8 w-auto max-w-[190px] mix-blend-screen sm:h-10 md:h-[54px]"
            />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="hidden items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-cyan-100/80 transition-all hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:text-cyan-100 sm:inline-flex"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>
            <LanguageSwitcher />
          </div>
        </header>

        <section className="relative py-8 text-center md:py-10">
          <div className="pointer-events-none absolute left-[7%] top-1/2 hidden h-px w-[25%] bg-gradient-to-r from-transparent via-slate-400/28 to-slate-400/12 md:block" />
          <div className="pointer-events-none absolute right-[7%] top-1/2 hidden h-px w-[25%] bg-gradient-to-l from-transparent via-slate-400/28 to-slate-400/12 md:block" />
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.42em] text-cyan-300/70 md:hidden">
            {copy.kicker}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-cyan-100 drop-shadow-[0_0_22px_rgba(125,226,255,0.55)] md:text-5xl">
            {langKey === 'en' ? 'VAID VERIFICATION' : copy.title}
          </h1>
          <p className="mt-3 text-sm text-slate-300/78 md:text-xl">
            {copy.subtitle}
          </p>
        </section>

        <main className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-[2.1rem] bg-cyan-950/[0.35] shadow-[inset_0_0_64px_rgba(14,165,233,0.09)] backdrop-blur-xl" />
          <div className="pointer-events-none absolute inset-0 rounded-[2.1rem] border-2 border-slate-200/55" />

          <section className="relative px-4 py-5 md:px-8 md:py-8">
            <div className="relative grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(250px,0.42fr)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.48fr)]">
              <section className="flex rounded-2xl border-2 border-slate-200/55 bg-black/18 p-2 shadow-[0_0_20px_rgba(14,165,233,0.06)]">
                <div className="relative flex min-h-[190px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#030814]/64 p-1">
                  {!certificateReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
                    </div>
                  )}
                  <div className="relative aspect-video w-full max-w-[1220px]">
                    <canvas
                      ref={canvasRef}
                      className="block h-full w-full rounded-lg object-contain shadow-[0_18px_55px_rgba(0,0,0,0.45)]"
                      style={{ display: certificateReady ? 'block' : 'none' }}
                    />
                  </div>
                </div>
              </section>

              <aside className="flex h-full flex-col gap-2.5">
                {[
                  { label: copy.characterName, value: record.character_name, Icon: User },
                  { label: copy.creator, value: record.creator_name, Icon: User },
                  { label: copy.citizenId, value: record.id, Icon: Hash, mono: true },
                  { label: copy.timestamp, value: formatDate(record.created_at), Icon: Calendar, long: true },
                ].map(({ label, value, Icon, mono, long }) => (
                  <div key={label} className="rounded-xl border-2 border-slate-200/55 bg-[#07172f]/76 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:flex md:flex-1 md:items-center">
                    <div className="flex w-full items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
                      <div className={`shrink-0 ${type.metaLabelBox}`}>
                        <div className={`${langKey === 'en' ? 'uppercase' : ''} text-slate-400 ${type.metaLabel}`}>{label}</div>
                      </div>
                      <div className={`min-w-0 flex-1 text-left font-semibold leading-snug text-white ${(mono || long) ? 'whitespace-nowrap' : ''} ${long ? type.metaValueLong : type.metaValue} ${mono ? 'font-mono' : ''}`}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border-2 border-slate-200/55 bg-gradient-to-br from-cyan-400/9 to-emerald-400/8 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:flex md:flex-[1.45] md:items-center">
                  <div className="flex w-full items-center gap-3">
                    <ShieldCheck className="h-7 w-7 shrink-0 text-cyan-300" />
                    <div className="min-w-0 flex-1">
                      <div className={`${langKey === 'en' ? 'uppercase' : ''} text-slate-400 ${type.proofLabel}`}>{copy.proofStatus}</div>
                      <div className={`mt-1 font-black text-green-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.38)] ${type.proofTitle}`}>
                        {copy.digitalSeal}
                      </div>
                      <div className={`text-slate-300 ${type.proofText}`}>{statusLabel}</div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-green-400 text-green-300 shadow-[0_0_18px_rgba(74,222,128,0.35)]">
                      ✓
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <section className="relative mt-6 overflow-hidden rounded-2xl border-2 border-slate-200/55 p-5">
              <div className="pointer-events-none absolute -inset-[2px] rounded-[inherit] bg-[#041126]/70 shadow-[inset_0_0_46px_rgba(14,165,233,0.07)] backdrop-blur-xl" />
              <img
                src="/digital-globe-transparent.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute top-[12%] left-[36%] hidden w-[43%] max-w-[760px] opacity-[0.225] mix-blend-screen brightness-[0.72] contrast-[1.28] saturate-[1.55] hue-rotate-[8deg] lg:block"
              />

              <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.34fr)]">
                <div className="min-h-[150px]">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="h-8 w-8 text-cyan-300" />
                    <h3 className={`font-black text-cyan-300 ${type.aboutTitle}`}>{copy.aboutTitle}</h3>
                  </div>
                  <p className={`mt-4 max-w-3xl text-slate-300/86 ${type.aboutText}`}>
                    {copy.aboutText}
                  </p>
                </div>

                <div className="flex flex-col justify-center gap-4">
                  <button
                    onClick={handleDownloadBundle}
                    disabled={!certificateReady}
                    className="flex items-center justify-center gap-3 rounded-xl border border-cyan-100/30 bg-gradient-to-r from-cyan-500 to-blue-700 px-5 py-4 text-base font-bold text-white shadow-[0_0_30px_rgba(0,145,255,0.42)] transition-all hover:from-cyan-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700"
                  >
                    <Download className="h-5 w-5" />
                    {copy.download}
                  </button>
                  <button
                    onClick={handleInspectProof}
                    className="flex items-center justify-center gap-3 rounded-xl border border-cyan-300/50 bg-black/18 px-5 py-4 text-base font-bold text-cyan-200 transition-all hover:border-cyan-200 hover:bg-cyan-300/10"
                  >
                    <Lock className="h-5 w-5" />
                    {copy.proofStatus}
                  </button>
                </div>
              </div>
            </section>
          </section>
        </main>
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
