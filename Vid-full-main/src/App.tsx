import { useState, useEffect, useCallback } from 'react';
import { Upload, Shield, FileCheck, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { calculateSHA256 } from './utils/sha256';
import { AnimatedGrid } from './components/AnimatedGrid';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ForgingAnimation } from './components/ForgingAnimation';
import { PaywallModal } from './components/PaywallModal';
import {
  clearSavedActivationCode,
  consumeGenerationAccess,
  getActivationCodeInfo,
  getSavedActivationCode,
  markGenerationReady,
  getRemainingFreeCertificates,
  normalizeActivationCode,
  saveActivationCode,
  type ActivationCodeInfo,
} from './utils/licenseManager';
import './i18n/config';

const HERO_LIGHT_BG_SRC = '/hero_light_bg.png';
const HERO_FIGURE_SRC = '/hero_figure.png';

function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const heroTitleHighlightParts = t('hero.titleHighlight').split(' ');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showForgingAnimation, setShowForgingAnimation] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [activationCodeInfo, setActivationCodeInfo] = useState<ActivationCodeInfo | null>(null);
  const [activationCodeError, setActivationCodeError] = useState('');
  const [isCheckingActivationCode, setIsCheckingActivationCode] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [isSubmittingNext, setIsSubmittingNext] = useState(false);


  const refreshAccessDashboard = useCallback(async (preferredCode?: string) => {
    const [freeRemaining, savedCodeInfo] = await Promise.all([
      getRemainingFreeCertificates(),
      getActivationCodeInfo(preferredCode || getSavedActivationCode()),
    ]);

    setRemainingCredits(freeRemaining);
    setActivationCodeInfo(savedCodeInfo);

    return {
      freeRemaining,
      savedCodeInfo,
    };
  }, []);

  useEffect(() => {
    const savedCode = getSavedActivationCode();
    if (savedCode) {
      setActivationCodeInput(savedCode);
    }

    refreshAccessDashboard(savedCode);
  }, [refreshAccessDashboard]);

  useEffect(() => {
    const syncDashboard = () => {
      const preferredCode = activationCodeInput.trim() || getSavedActivationCode();
      refreshAccessDashboard(preferredCode);
    };

    const intervalId = window.setInterval(syncDashboard, 5000);
    const handleFocus = () => syncDashboard();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDashboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activationCodeInput, refreshAccessDashboard]);

  const handleBindActivationCode = useCallback(async (codeOverride?: string) => {
    const rawCode = (codeOverride ?? activationCodeInput).trim();
    if (!rawCode) {
      setActivationCodeError('请输入激活码');
      return null;
    }

    setIsCheckingActivationCode(true);
    setActivationCodeError('');

    try {
      const info = await getActivationCodeInfo(rawCode);

      if (!info) {
        setActivationCodeInfo(null);
        setActivationCodeError('激活码不存在，请检查后重试');
        return null;
      }

      setActivationCodeInfo(info);
      setActivationCodeInput(info.code);

      if (info.status !== 'active' || info.remaining_uses <= 0) {
        clearSavedActivationCode();
        setActivationCodeError('这个激活码已用完或不可用，请更换新的激活码');
        return info;
      }

      saveActivationCode(info.code);
      setActivationCodeError('');
      return info;
    } finally {
      setIsCheckingActivationCode(false);
    }
  }, [activationCodeInput]);

  const handleImageChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleEditInfo = () => {
    if (!imagePreview || !imageFile) return;
    if (!characterName.trim() || !creatorName.trim()) {
      setGenerationError('请先填写角色名称和创作者名称');
      return;
    }
    setGenerationError('');
    setIsEditing(true);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingImage) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleImageMouseUp = () => {
    setIsDraggingImage(false);
  };

  const handleScaleChange = (newScale: number) => {
    setImageScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const handleNextToGenerator = async () => {
    if (isSubmittingNext) return;

    if (!imagePreview || !imageFile) {
      setGenerationError('请先上传图片');
      return;
    }

    if (!characterName.trim() || !creatorName.trim()) {
      setGenerationError('请先返回上一步填写角色名称和创作者名称');
      return;
    }

    setGenerationError('');
    setIsSubmittingNext(true);

    try {
      const normalizedInput = normalizeActivationCode(activationCodeInput);
      if (activationCodeInput.trim() && normalizedInput !== activationCodeInput) {
        setActivationCodeInput(normalizedInput);
      }

      const { freeRemaining, savedCodeInfo } = await refreshAccessDashboard(normalizedInput);
      let activeActivationCode = savedCodeInfo ?? activationCodeInfo;

      // Free quota takes priority. Only validate activation code after free quota is exhausted.
      if (freeRemaining <= 0 && normalizedInput) {
        activeActivationCode = await handleBindActivationCode(normalizedInput);
      } else if (freeRemaining > 0) {
        setActivationCodeError('');
      }

      const hasUsableActivationCode = !!activeActivationCode
        && activeActivationCode.status === 'active'
        && activeActivationCode.remaining_uses > 0;

      if (freeRemaining <= 0 && !hasUsableActivationCode) {
        if (!activeActivationCode && normalizedInput) {
          setActivationCodeError('激活码不存在，请检查后重试');
        }
        setShowPaywall(true);
        setIsSubmittingNext(false);
        return;
      }

      const canvas = document.createElement('canvas');
      const size = 240;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const img = new Image();
      img.onload = async () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        const displayContainerSize = 320;

        const displayImageWidth = displayContainerSize;
        const displayImageHeight = (img.height / img.width) * displayContainerSize;

        const displayCenterX = displayContainerSize / 2;
        const displayCenterY = displayContainerSize / 2;

        const scaledDisplayWidth = displayImageWidth * imageScale;
        const scaledDisplayHeight = displayImageHeight * imageScale;

        const displayX = displayCenterX - scaledDisplayWidth / 2 + imagePosition.x;
        const displayY = displayCenterY - scaledDisplayHeight / 2 + imagePosition.y;

        const canvasRatio = size / displayContainerSize;

        const canvasX = displayX * canvasRatio;
        const canvasY = displayY * canvasRatio;
        const canvasWidth = scaledDisplayWidth * canvasRatio;
        const canvasHeight = scaledDisplayHeight * canvasRatio;

        ctx.drawImage(img, canvasX, canvasY, canvasWidth, canvasHeight);
        ctx.restore();

        const croppedAvatar = canvas.toDataURL('image/png');
        localStorage.setItem('vid_uploaded_avatar', croppedAvatar);
        localStorage.setItem('vid_character_name', characterName);
        localStorage.setItem('vid_creator_name', creatorName);

        try {
          const hash = await calculateSHA256(imageFile);
          localStorage.setItem('vid_original_file_hash', hash);

          const accessResult = await consumeGenerationAccess(normalizedInput);
          const refreshedState = await refreshAccessDashboard(accessResult.activation_code?.code || normalizedInput);

          if (accessResult.activation_code?.code) {
            setActivationCodeInput(accessResult.activation_code.code);
          }

          if (!accessResult.success) {
            if (accessResult.error === 'ACTIVATION_CODE_REQUIRED') {
              setActivationCodeError('请输入激活码后再生成');
            } else if (accessResult.activation_code) {
              setActivationCodeInfo(accessResult.activation_code);
              setActivationCodeError('这个激活码已用完或不可用，请更换新的激活码');
            } else if (accessResult.error === 'FREE_QUOTA_CONSUME_FAILED') {
              setGenerationError('剩余次数扣减失败，请稍后重试');
            } else {
              setGenerationError('生成前校验失败，请稍后重试');
            }

            const latestActivationCode = accessResult.activation_code ?? refreshedState.savedCodeInfo;
            const hasUsableLatestActivationCode = !!latestActivationCode
              && latestActivationCode.status === 'active'
              && latestActivationCode.remaining_uses > 0;

            if (refreshedState.freeRemaining <= 0 && !hasUsableLatestActivationCode) {
              setShowPaywall(true);
            }
            return;
          }

          setRemainingCredits(accessResult.free_remaining);
          setActivationCodeInfo(accessResult.activation_code ?? refreshedState.savedCodeInfo);
          setActivationCodeError('');
          setGenerationError('');
          markGenerationReady();
          setShowForgingAnimation(true);
        } catch (error) {
          console.error('Failed to prepare generation flow:', error);
          setGenerationError('生成流程异常，请稍后重试');
        } finally {
          setIsSubmittingNext(false);
        }
      };

      img.onerror = () => {
        setGenerationError('图片读取失败，请重新上传后重试');
        setIsSubmittingNext(false);
      };

      img.src = imagePreview;
    } catch (error) {
      console.error('Failed to check generation prerequisites:', error);
      setGenerationError('次数状态校验失败，请稍后重试');
      setIsSubmittingNext(false);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    console.log('handleAnimationComplete called');
    setShowForgingAnimation(false);
    console.log('Navigating to /card-generator');
    navigate('/card-generator');
  }, [navigate]);

  const usableActivationRemaining =
    activationCodeInfo && activationCodeInfo.status === 'active' && activationCodeInfo.remaining_uses > 0
      ? activationCodeInfo.remaining_uses
      : 0;
  const remainingCountForDisplay =
    remainingCredits === null
      ? null
      : (remainingCredits > 0 ? remainingCredits : usableActivationRemaining);
  const hasRemainingCount = (remainingCountForDisplay ?? 0) > 0;

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(4, 7, 24, 0) 0%,
              rgba(4, 7, 24, 0.36) 48%,
              rgba(4, 7, 24, 0.74) 62%,
              rgba(4, 7, 24, 0.94) 74%,
              #040718 100%
            ),
            url(${HERO_LIGHT_BG_SRC})
          `,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
        aria-hidden
      />
      <AnimatedGrid />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/000.png"
              alt="V-ID Logo"
              className="h-16 w-auto"
            />
          </div>
          <LanguageSwitcher />
        </header>

        <section className="py-20 text-center">
          <div className="vaid-hero relative w-full max-w-6xl mx-auto">
            <div className="vaid-hero-shell" aria-hidden>
              <div className="vaid-hero-shell-highlight" />
              <div className="vaid-hero-top-caps">
                <span />
                <span />
                <span />
              </div>
              <div className="vaid-hero-right-rail">
                <span />
                <span />
                <span />
              </div>
              <div className="vaid-hero-shield-chip">
                <Shield className="w-8 h-8" strokeWidth={2.2} />
              </div>
            </div>
            <div className="vaid-hero-bottom-notch" aria-hidden />

            <div className="vaid-hero-copy-panel">
              <p className="vaid-hero-kicker">VAID // IDENTITY PROTOCOL</p>
              <h2 className="vaid-hero-title">
                <span>{t('hero.title')}</span>
                {heroTitleHighlightParts.length > 1 ? (
                  <>
                    <span>{heroTitleHighlightParts[0]}</span>
                    <span>{heroTitleHighlightParts.slice(1).join(' ')}</span>
                  </>
                ) : (
                  <span>{t('hero.titleHighlight')}</span>
                )}
              </h2>
              <p className="vaid-hero-subtitle">
                {t('hero.subtitle')}
              </p>
              <button
                onClick={() => document.getElementById('submission')?.scrollIntoView({ behavior: 'smooth' })}
                className="vaid-hero-cta"
              >
                {t('hero.cta')}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <img
              src={HERO_FIGURE_SRC}
              alt="Cyber character portrait"
              className="vaid-hero-figure"
              loading="eager"
            />
          </div>
        </section>

        <section className="py-16">
          <h3 className="text-3xl font-bold text-center text-white mb-16">
            {t('process.title')}
          </h3>
          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {['step1', 'step2', 'step3', 'step4'].map((step, index) => (
              <div
                key={step}
                className="relative p-6 rounded-xl bg-[#0a0a0a]/50 backdrop-blur-xl border border-slate-800 hover:border-blue-500/50 transition-all group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center mb-4">
                    {index === 0 && <Upload className="w-6 h-6 text-blue-400" />}
                    {index === 1 && <Shield className="w-6 h-6 text-blue-400" />}
                    {index === 2 && <FileCheck className="w-6 h-6 text-blue-400" />}
                    {index === 3 && <Shield className="w-6 h-6 text-blue-400" />}
                  </div>
                  <div className="text-xl font-bold text-white mb-2">
                    {t(`process.${step}.title`)}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {t(`process.${step}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="submission" className="py-16 pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="relative p-8 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-blue-500/30 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 rounded-2xl" />

              <div className="relative">
                <h3 className="text-2xl font-bold text-white mb-8 text-center">
                  {t('form.title')}
                </h3>

                {remainingCountForDisplay !== null && (
                  <div className={`mb-6 p-3 rounded-lg border flex items-center justify-between ${
                    hasRemainingCount
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <span className={`text-sm font-medium ${hasRemainingCount ? 'text-green-400' : 'text-red-400'}`}>
                      剩余次数：{remainingCountForDisplay} 次
                    </span>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                    >
                      购买套餐
                    </button>
                  </div>
                )}

                <div className="mb-6 p-4 bg-slate-900/70 border border-slate-700 rounded-xl">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={activationCodeInput}
                      onChange={(e) => {
                        const nextValue = e.target.value.toUpperCase();
                        setActivationCodeInput(nextValue);
                        if (activationCodeInfo && nextValue !== activationCodeInfo.code) {
                          setActivationCodeInfo(null);
                        }
                        setActivationCodeError('');
                        setGenerationError('');
                      }}
                      placeholder="输入激活码，例如 VAID-ABCD-EFGH-IJKL"
                      className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => handleBindActivationCode()}
                      disabled={isCheckingActivationCode || !activationCodeInput.trim()}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                    >
                      {isCheckingActivationCode ? '验证中...' : '验证激活码'}
                    </button>
                  </div>

                  {activationCodeError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                      {activationCodeError}
                    </div>
                  )}

                  {generationError && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200">
                      {generationError}
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <>
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                        isDragging
                          ? 'border-blue-400 bg-blue-500/10'
                          : imagePreview
                          ? 'border-slate-700'
                          : 'border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img
                            src={imagePreview}
                            alt="Character preview"
                            className="max-h-64 mx-auto rounded-lg shadow-lg border border-blue-500/30"
                          />
                          <button
                            onClick={() => {
                              setImagePreview(null);
                              setImageFile(null);
                            }}
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            {t('form.changeImage')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                          <p className="text-slate-300 mb-2">
                            {t('form.dragDrop')}
                          </p>
                          <p className="text-sm text-slate-500 mb-4">{t('form.or')}</p>
                          <label className="inline-block">
                            <span className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-medium">
                              {t('form.selectFile')}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files && handleImageChange(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </div>

                    <div className="mt-8 space-y-6">
                      <div>
                        <label htmlFor="characterName" className="block text-left text-base font-medium text-white mb-2">
                          Character Name
                        </label>
                        <input
                          id="characterName"
                          type="text"
                          value={characterName}
                          onChange={(e) => {
                            setCharacterName(e.target.value);
                            setGenerationError('');
                          }}
                          placeholder="e.g., Nova StarSeeker"
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="creatorName" className="block text-left text-base font-medium text-white mb-2">
                          Creator Name
                        </label>
                        <input
                          id="creatorName"
                          type="text"
                          value={creatorName}
                          onChange={(e) => {
                            setCreatorName(e.target.value);
                            setGenerationError('');
                          }}
                          placeholder="e.g., Alex Chen"
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="mt-8">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            agreedToTerms
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-transparent border-slate-500 group-hover:border-blue-400'
                          }`}>
                            {agreedToTerms && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-slate-400 leading-relaxed">
                          我已阅读并同意{' '}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            用户协议
                          </a>
                          {' '}和{' '}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            隐私政策
                          </a>
                          ，了解浏览器指纹仅用于免费额度管理，付费套餐将通过激活码交付
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleEditInfo}
                      disabled={!imageFile || !agreedToTerms || !characterName.trim() || !creatorName.trim()}
                      className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                      Edit Info
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div
                      className="relative w-80 h-80 mx-auto"
                      onMouseMove={handleImageMouseMove}
                      onMouseUp={handleImageMouseUp}
                      onMouseLeave={handleImageMouseUp}
                    >
                      <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img
                            src={imagePreview || undefined}
                            alt="Character preview"
                            className="cursor-move select-none"
                            style={{
                              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                              maxWidth: 'none',
                              width: '100%',
                              height: 'auto',
                              transition: isDraggingImage ? 'none' : 'transform 0.1s ease-out'
                            }}
                            onMouseDown={handleImageMouseDown}
                            draggable={false}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400/50 pointer-events-none" />
                    </div>

                    <div className="text-center text-slate-300">
                      <p className="mb-2">拖拽图片调整位置</p>
                      <p className="text-sm text-slate-500">使用下方滑块缩放图片</p>
                    </div>

                    <div className="space-y-4 px-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-slate-400">缩放</label>
                          <span className="text-sm text-blue-400">{Math.round(imageScale * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={imageScale}
                          onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      <button
                        onClick={() => {
                          setImageScale(1);
                          setImagePosition({ x: 0, y: 0 });
                        }}
                        className="w-full py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                      >
                        重置位置和缩放
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNextToGenerator}
                        disabled={isSubmittingNext}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                      >
                        {isSubmittingNext ? '处理中...' : 'Next'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 border-t border-slate-800">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <h4 className="font-semibold text-amber-400 mb-2">{t('footer.disclaimer')}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('footer.disclaimerText')}
                </p>
              </div>

              <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <h4 className="font-semibold text-blue-400 mb-2">{t('footer.manifesto')}</h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  {t('footer.manifestoText')}
                </p>
              </div>
            </div>

            <div className="text-center text-slate-600 text-sm pt-6 space-y-2">
              <p>{t('footer.copyright')}</p>
              <p className="text-slate-700 text-xs">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">
                  {t('footer.icp')}: 京ICP备2026017686号
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>


      {showForgingAnimation && (
        <ForgingAnimation
          avatarUrl={imagePreview || undefined}
          characterName={characterName}
          onComplete={handleAnimationComplete}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
}

export default App;
