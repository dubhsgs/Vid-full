import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { calculateSHA256 } from '../utils/sha256';
import {
  buildArchiveCertificatePdf,
  buildEvidenceManifest,
  getDownloadLanguage,
  getLocalizedBundleNames,
  getVerificationGuide,
  type ArchiveCertificateMetadata,
  type EvidenceManifest,
  type FormData,
} from '../utils/archiveDownload';
import { consumeGenerationReady } from '../utils/licenseManager';
import { CERTIFICATE_CANVAS_WIDTH, formatCertificateIssuedDate, renderCertificateCanvas } from '../utils/certificateCanvas';
import {
  clearLegacyDownloadArchiveIdentityStorage,
  clearPendingDownloadArchiveIdentity,
  getPendingDownloadArchiveIdentity,
} from '../utils/downloadArchiveIdentity';

const ASSET_BASE_URL = import.meta.env.BASE_URL || '/';
const DOWNLOAD_CARD_IMAGE_SESSION_KEY = 'vid_download_card_image_base64';
const DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY = 'vid_download_card_image_version';
const DOWNLOAD_CARD_IMAGE_VERSION = 'inter-self-hosted-20260616';
const DOWNLOAD_CREATOR_LEGAL_NAME_SESSION_KEY = 'vid_download_creator_legal_name';

function resolveAssetUrl(path: string): string {
  return `${ASSET_BASE_URL}${path.replace(/^\/+/, '')}`;
}

function base64PngToBlob(value: string): Blob | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: 'image/png' });
  } catch (error) {
    console.warn('[CardGenerator] Stored lossless card image is invalid:', error);
    return null;
  }
}

function getStoredDownloadCardImageBase64(): string | null {
  const imageBase64 = sessionStorage.getItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY);
  if (!imageBase64) return null;

  if (sessionStorage.getItem(DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY) !== DOWNLOAD_CARD_IMAGE_VERSION) {
    sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY);
    sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY);
    return null;
  }

  return imageBase64;
}

function getCardCopy() {
  return {
    status: 'VERIFIED',
    description: 'THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.',
    canvas: {
      nameLabel: 'NAME:',
      statusLabel: 'STATUS:',
      createdLabel: 'CREATED:',
      recordIdLabel: 'RECORD ID:',
      proofLabel: 'PROOF:',
      proofValue: 'Blockchain sealed',
    },
  };
}

export function CardGenerator() {
  const { t, i18n } = useTranslation();
  const cardCopy = useMemo(() => getCardCopy(), []);
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
  const [creatorDocumentNumber, setCreatorDocumentNumber] = useState(
    () => getPendingDownloadArchiveIdentity().creatorDocumentNumber
  );

  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [textureImg, setTextureImg] = useState<HTMLImageElement | null>(null);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCardImageBase64] = useState<string | null>(() => getStoredDownloadCardImageBase64());

  const generateSerialId = useCallback(() => {
    const now = Date.now();
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seed = `${now.toString(36)}${Math.floor(Math.random() * 0x1000000).toString(36)}`.toUpperCase();
    let code = '';

    for (let i = 0; i < 8; i += 1) {
      const charCode = seed.charCodeAt(i % seed.length) + now + i * 17;
      code += alphabet[charCode % alphabet.length];
    }

    const recordId = `V${code}`;
    return `${recordId.slice(0, 3)}-${recordId.slice(3, 6)}-${recordId.slice(6)}`;
  }, []);

  useEffect(() => {
    const initializeCard = async () => {
      clearLegacyDownloadArchiveIdentityStorage();
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

      const issuedDate = formatCertificateIssuedDate(new Date(), 'en');

      setForm(prev => ({
        ...prev,
        name: savedName,
        status: cardCopy.status,
        issuedDate,
        description: cardCopy.description,
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
  }, [CARD_GENERATOR_SESSION_KEY, cardCopy.description, cardCopy.status, generateSerialId, navigate, siteOrigin, t]);

  const loadImage = useCallback((src: string, timeout = 10000): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeoutId = window.setTimeout(() => {
        img.src = '';
        reject(new Error(`Image load timeout: ${src}`));
      }, timeout);
      img.onload = () => {
        window.clearTimeout(timeoutId);
        resolve(img);
      };
      img.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error(`Image load failed: ${src}`));
      };
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

    let cancelled = false;

    void renderCertificateCanvas(canvas, {
      fields: form,
      assets: {
        backgroundImage: bgImg,
        logoImage: logoImg,
        textureImage: textureImg,
        avatarImage: avatarImg,
        qrImage: qrImg,
      },
      copy: cardCopy.canvas,
    }).then((rendered) => {
      if (!cancelled && !rendered) {
        console.error('[CardGenerator] Canvas context unavailable');
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error('[CardGenerator] Failed to render certificate:', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [avatarImg, bgImg, cardCopy.canvas, form, logoImg, qrImg, textureImg]);

  const exportPNG = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      let imageBlob = downloadCardImageBase64 ? base64PngToBlob(downloadCardImageBase64) : null;

      if (!imageBlob) {
        const canvas = document.createElement('canvas');
        const rendered = await renderCertificateCanvas(canvas, {
          fields: form,
          assets: {
            backgroundImage: bgImg,
            logoImage: logoImg,
            textureImage: textureImg,
            avatarImage: avatarImg,
            qrImage: qrImg,
          },
          copy: cardCopy.canvas,
        }, { dpr: 2 });
        if (!rendered) {
          throw new Error('Canvas context unavailable');
        }

        imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Card image export failed'));
            }
          }, 'image/png');
        });
      }

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const verifyUrl = citizenId ? `${siteOrigin}/verify/${citizenId}` : siteOrigin;
      const downloadLanguage = getDownloadLanguage(i18n.resolvedLanguage ?? i18n.language);
      const bundleNames = getLocalizedBundleNames(downloadLanguage);
      const verificationGuide = getVerificationGuide(downloadLanguage, form, sha256Hash, verifyUrl);
      let archiveMetadata: ArchiveCertificateMetadata = {
        creatorLegalName: sessionStorage.getItem(DOWNLOAD_CREATOR_LEGAL_NAME_SESSION_KEY) || localStorage.getItem('vid_creator_name') || '',
        creatorDocumentNumber,
      };
      let evidenceManifest: EvidenceManifest | null = null;

      if (citizenId) {
        const { data: recordData, error: recordError } = await supabase
          .from('v_ids')
          .select('created_at')
          .eq('friendly_id', citizenId)
          .maybeSingle();

        if (recordError) {
          console.warn('[CardGenerator] Archive certificate metadata unavailable:', recordError);
        } else if (recordData) {
          archiveMetadata = {
            ...archiveMetadata,
            createdAt: String(recordData.created_at || ''),
          };
        }

        const { data: evidenceData, error: evidenceError } = await supabase
          .from('v_id_evidence_materials')
          .select('file_name, material_type, file_size_bytes, sha256_hash, created_at')
          .eq('friendly_id', citizenId);

        if (evidenceError) {
          console.warn('[CardGenerator] Private evidence manifest unavailable:', evidenceError);
        } else if (evidenceData?.length) {
          evidenceManifest = await buildEvidenceManifest(form, evidenceData.map((material) => ({
            file_name: String(material.file_name || ''),
            material_type: String(material.material_type || ''),
            file_size_bytes: Number(material.file_size_bytes || 0),
            sha256_hash: String(material.sha256_hash || ''),
            created_at: String(material.created_at || ''),
          })));
        }
      }

      const archiveCertificatePdf = await buildArchiveCertificatePdf(
        form,
        sha256Hash,
        verifyUrl,
        archiveMetadata,
        evidenceManifest
      );

      zip.file(bundleNames.identityCard, imageBlob);
      zip.file(bundleNames.archiveCertificate, archiveCertificatePdf);
      zip.file(bundleNames.verificationGuide, verificationGuide);

      if (citizenId) {
        try {
          const { data: otsData, error: otsError } = await supabase.functions.invoke('ots-download', {
            body: { friendly_id: citizenId },
          });
          if (otsData?.ots_file_base64 && otsData?.file_name) {
            const binary = atob(otsData.ots_file_base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
              bytes[i] = binary.charCodeAt(i);
            }
            zip.file(otsData.file_name, bytes);
          } else if (otsError || otsData?.error) {
            console.warn('[CardGenerator] OTS file unavailable, continuing without it:', otsError || otsData?.error);
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
      clearPendingDownloadArchiveIdentity();
      setCreatorDocumentNumber('');

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
      {downloadCardImageBase64 ? (
        <img
          src={`data:image/png;base64,${downloadCardImageBase64}`}
          alt={t('cardGenerator.identityPreview')}
          className="relative z-10 block rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: `${CERTIFICATE_CANVAS_WIDTH}px`,
            maxHeight: 'calc(100svh - 9rem)',
            display: 'block',
          }}
        />
      ) : (
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
      )}
      <p className="relative z-10 mt-6 text-slate-500 text-xs text-center max-w-md leading-relaxed">
        * {t('cardGenerator.recordedBy')}
      </p>
    </div>
  );
}
