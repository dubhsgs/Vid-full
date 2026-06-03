import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Calendar, User, Hash, Home, ShieldCheck } from 'lucide-react';
import { supabase, supabaseAnonKey, supabaseUrl } from '../utils/supabase';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { formatCertificateIssuedDate, renderCertificateCanvas } from '../utils/certificateCanvas';

interface VIDRecord {
  id: string;
  character_name: string;
  creator_name: string;
  image_url: string;
  created_at: string;
  ots_status: string;
}

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
    citizenId: 'Record ID',
    timestamp: 'Created',
    sealDescription: 'This digital seal has entered VAID chain-based time anchoring, forming traceable and tamper-resistant proof of existence.',
    aboutTitle: 'About This Verification',
    aboutText: 'This VAID record is part of the VAID digital identity archive. The system creates a unique digital seal for the original work and connects it to a blockchain-based time anchor, helping prove that this digital identity existed at a specific moment and remains traceable, verifiable, and tamper-resistant.',
    status: {
      confirmed: 'VAID digital identity archived',
      stamped: 'VAID digital identity archive in progress',
      failed: 'VAID digital identity archive failed',
      pending: 'VAID digital identity archive in progress',
    },
    archiveHint: 'Archive confirmation usually completes within 24 hours.',
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
    citizenId: '档案编号',
    timestamp: '生成时间',
    sealDescription: '此数字存证印记已进入 VAID 的链上时间锚定流程，用于形成不可篡改、可追溯的存在证明。',
    aboutTitle: '关于此验证',
    aboutText: '此 VAID 记录已写入 VAID 的数字身份存证体系，并生成公开可验证的证书档案。系统会为原始作品生成唯一的数字存证印记，并将其接入区块链时间锚定流程，用于证明该数字身份在特定时间已经存在，且后续记录可追溯、可核验、不可随意篡改。',
    status: {
      confirmed: 'VAID 数字身份归档成功',
      stamped: 'VAID 数字身份链上归档中',
      failed: 'VAID 数字身份归档失败',
      pending: 'VAID 数字身份链上归档中',
    },
    archiveHint: '链上归档通常会在 24 小时内完成。',
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
    citizenId: 'Record ID',
    timestamp: '生成日時',
    sealDescription: 'このデジタル証明シールは、VAID のチェーンベース時間アンカー処理に入り、追跡可能で改ざん耐性のある存在証明を形成します。',
    aboutTitle: 'この検証について',
    aboutText: 'この VAID レコードは、VAID のデジタルアイデンティティアーカイブに記録されています。システムは原作品に固有のデジタル証明シールを生成し、ブロックチェーンベースの時間アンカーへ接続することで、このデジタルアイデンティティが特定の時点で存在していたことを示し、追跡・検証・改ざん耐性を高めます。',
    status: {
      confirmed: 'VAID デジタルアイデンティティのアーカイブ完了',
      stamped: 'VAID デジタルアイデンティティをアーカイブ中',
      failed: 'VAID デジタルアイデンティティのアーカイブ失敗',
      pending: 'VAID デジタルアイデンティティをアーカイブ中',
    },
    archiveHint: 'アーカイブ確認は通常24時間以内に完了します。',
  },
};

const verifyTypography = {
  en: {
    metaLabelBox: 'w-[118px] sm:w-[150px]',
    metaLabel: 'text-[0.7rem] tracking-[0.18em]',
    metaValue: 'text-[0.95rem]',
    metaValueLong: 'text-[0.95rem]',
    proofText: 'text-[0.9rem]',
    proofHint: 'text-[0.72rem]',
    aboutTitle: 'text-[1.55rem] tracking-[0.1em]',
    aboutText: 'text-[1.08rem] leading-10',
  },
  zh: {
    metaLabelBox: 'w-[100px]',
    metaLabel: 'text-[0.82rem] tracking-[0.06em]',
    metaValue: 'text-[1.04rem]',
    metaValueLong: 'text-[1.04rem]',
    proofText: 'text-[1.02rem]',
    proofHint: 'text-[0.78rem]',
    aboutTitle: 'text-[1.62rem] tracking-[0.08em]',
    aboutText: 'text-[1.05rem] leading-9',
  },
  ja: {
    metaLabelBox: 'w-[124px]',
    metaLabel: 'text-[0.76rem] tracking-[0.03em]',
    metaValue: 'text-[0.98rem]',
    metaValueLong: 'text-[0.98rem]',
    proofText: 'text-[0.86rem]',
    proofHint: 'text-[0.72rem]',
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

      try {
        const normalizedId = id.toUpperCase();

        const { data, error } = await supabase
          .from('public_v_ids')
          .select('friendly_id, character_name, creator_name, image_url, created_at, ots_status')
          .eq('friendly_id', normalizedId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          console.error('[VerifyPage] No record found for ID:', normalizedId);
          setError('No record found for this Record ID');
        } else {
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
        const url = `${supabaseUrl}/functions/v1/ots-verify`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
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
      return;
    }

    const canvas = canvasRef.current;
    try {
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

      let qrImg: HTMLImageElement | null = null;
      try {
        const qrUrl = `${window.location.origin}/verify/${record.id}`;
        const { default: QRCode } = await import('qrcode');
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 240,
          margin: 1,
          color: { dark: '#f18ab5', light: '#00000000' },
          errorCorrectionLevel: 'M',
        });
        qrImg = await loadImage(qrDataUrl);
      } catch (err) {
        console.error('[VerifyPage] Failed to generate/load QR code:', err);
      }

      const issueDate = formatCertificateIssuedDate(new Date(record.created_at));
      const rendered = await renderCertificateCanvas(canvas, {
        fields: {
          name: record.character_name,
          status: 'VERIFIED',
          issuedDate: issueDate,
          serialId: record.id.toUpperCase(),
          description: 'THIS DOCUMENT PROVIDES VERIFIABLE EVIDENCE OF A UNIQUE DIGITAL IDENTITY RECORDED BY VAID.',
        },
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

  const statusLabel =
    otsStatus === 'confirmed' ? copy.status.confirmed :
    otsStatus === 'stamped' ? copy.status.stamped :
    otsStatus === 'failed' ? copy.status.failed :
    copy.status.pending;
  const isArchiveConfirmed = otsStatus === 'confirmed';
  const archiveTextClass = isArchiveConfirmed
    ? 'text-green-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.38)]'
    : 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.34)]';

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
              {copy.returnHome}
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
                      <div className={`min-w-0 flex-1 text-left font-semibold leading-snug text-white ${(mono || long) ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''} ${long ? type.metaValueLong : type.metaValue} ${mono ? 'font-mono' : ''}`}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border-2 border-slate-200/55 bg-gradient-to-br from-cyan-400/9 to-emerald-400/8 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:flex md:flex-[1.45] md:items-center">
                  <div className="flex w-full items-center gap-3">
                    <ShieldCheck className="h-7 w-7 shrink-0 text-cyan-300" />
                    <div className="min-w-0 flex-1">
                      <div className={`font-black leading-snug ${archiveTextClass} ${type.proofText}`}>{statusLabel}</div>
                      {!isArchiveConfirmed && (
                        <div className={`mt-1 leading-snug text-amber-100/72 ${type.proofHint}`}>
                          {copy.archiveHint}
                        </div>
                      )}
                    </div>
                    {isArchiveConfirmed ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-green-400 text-green-300 shadow-[0_0_18px_rgba(74,222,128,0.35)]">
                        ✓
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.3)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
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

              <div className="relative">
                <div className="min-h-[150px]">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="h-8 w-8 text-cyan-300" />
                    <h3 className={`font-black text-cyan-300 ${type.aboutTitle}`}>{copy.aboutTitle}</h3>
                  </div>
                  <p className={`mt-4 max-w-3xl text-slate-300/86 ${type.aboutText}`}>
                    {copy.aboutText}
                  </p>
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
