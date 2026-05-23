import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { calculateSHA256 } from '../utils/sha256';
import { consumeGenerationReady } from '../utils/licenseManager';
import { CERTIFICATE_CANVAS_WIDTH, renderCertificateCanvas } from '../utils/certificateCanvas';

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
  const { t } = useTranslation();
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
      const savedAvatar = isLocalPreview ? resolveAssetUrl('hero_figure.webp') : localStorage.getItem('vid_uploaded_avatar');
      const savedName = isLocalPreview ? 'Preview Character' : localStorage.getItem('vid_character_name');
      const creatorName = isLocalPreview ? 'VAID Preview' : localStorage.getItem('vid_creator_name');
      const hasCardSession = isLocalPreview || sessionStorage.getItem(CARD_GENERATOR_SESSION_KEY) === '1';

      if (!savedAvatar || !savedName || !creatorName) {
        sessionStorage.removeItem(CARD_GENERATOR_SESSION_KEY);
        setAccessError(t('cardGenerator.errors.missingData'));
        navigate('/', { replace: true });
        return;
      }

      if (!hasCardSession && !consumeGenerationReady()) {
        setAccessError(t('cardGenerator.errors.expiredSession'));
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

          setAccessError(t('cardGenerator.errors.missingRegisteredId'));
        } catch (err) {
          console.error('Unexpected error:', err);
          setAccessError(t('cardGenerator.errors.initializationFailed'));
        }
      })();
    };

    initializeCard();
  }, [CARD_GENERATOR_SESSION_KEY, formatIssuedDate, generateSerialId, navigate, siteOrigin, t]);

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
      const savedAvatar = isLocalPreview ? resolveAssetUrl('hero_figure.webp') : localStorage.getItem('vid_uploaded_avatar');
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
        : siteOrigin;

      const { default: QRCode } = await import('qrcode');
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderCertificateCanvas(canvas, {
      fields: form,
      assets: {
        backgroundImage: bgImg,
        logoImage: logoImg,
        textureImage: textureImg,
        avatarImage: avatarImg,
        qrImage: qrImg,
      },
    });
  }, [avatarImg, bgImg, form, logoImg, qrImg, textureImg]);

  const exportPNG = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const rendered = renderCertificateCanvas(canvas, {
        fields: form,
        assets: {
          backgroundImage: bgImg,
          logoImage: logoImg,
          textureImage: textureImg,
          avatarImage: avatarImg,
          qrImage: qrImg,
        },
      });
      if (!rendered) {
        throw new Error('Canvas context unavailable');
      }

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

ABOUT THE .OTS FILE:
The .ots file is a timestamp proof file. Keep it together with your VAID certificate image. It can be used later to verify that the certificate hash existed at the recorded time.


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

关于 .ots 文件：
.ots 文件是时间戳证明文件。请与 VAID 证书图片一起保存。它可用于日后验证该证书哈希在记录时间点已经存在。


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

.ots ファイルについて：
.ots ファイルはタイムスタンプ証明ファイルです。VAID 証明書画像と一緒に保存してください。後日、その証明書ハッシュが記録された時点で存在していたことを確認するために使用できます。

© VAID Protocol
`;

      const { default: JSZip } = await import('jszip');
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
      alert(t('cardGenerator.errors.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  if (accessError) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">{t('cardGenerator.cannotContinue')}</h1>
          <p className="text-slate-300 leading-relaxed">{accessError}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem(CARD_GENERATOR_SESSION_KEY);
              navigate('/');
            }}
            className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all"
          >
            {t('cardGenerator.backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden bg-[#030713] flex flex-col items-center px-2 sm:px-4">
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

      <div className="relative z-10 max-w-[1200px] w-full py-4 sm:p-6 flex justify-between items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('cardGenerator.identityPreview')}</h1>
        <div className="flex gap-4">
          <button
            onClick={exportPNG}
            disabled={isDownloading}
            className="px-5 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:cursor-wait disabled:opacity-70"
          >
            {isDownloading ? t('cardGenerator.downloading') : t('cardGenerator.download')}
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="relative z-10 block rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: `${CERTIFICATE_CANVAS_WIDTH}px`,
          maxHeight: 'calc(100svh - 9rem)',
          display: 'block',
        }}
      />
      <p className="relative z-10 mt-6 text-slate-500 text-xs text-center max-w-md leading-relaxed">
        * PROOF OF IDENTITY RECORDED BY VAID
      </p>
    </div>
  );
}
