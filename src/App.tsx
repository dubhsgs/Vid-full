import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Shield, FileCheck, ChevronDown, Download, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { calculateSHA256 } from './utils/sha256';
import { convertTemplateToImage } from './utils/htmlToImage';
import { HashDisplay } from './components/HashDisplay';
import { ProgressStage } from './components/ProgressStage';
import { AnimatedGrid } from './components/AnimatedGrid';
import { PaywallModal } from './components/PaywallModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { TemplateCertificate } from './components/TemplateCertificate';
import { ForgingAnimation } from './components/ForgingAnimation';
import {
  canGenerateCertificate,
  useFreeCertificate,
  getRemainingFreeCertificates,
  validateAndActivateLicense,
  hasValidLicense
} from './utils/licenseManager';
import './i18n/config';

function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isActivated, setIsActivated] = useState(hasValidLicense());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [remainingFree, setRemainingFree] = useState(getRemainingFreeCertificates());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [characterName, setCharacterName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showForgingAnimation, setShowForgingAnimation] = useState(false);

  useEffect(() => {
    setRemainingFree(getRemainingFreeCertificates());
  }, []);

  const heroImages = [
    'https://i.ibb.co/KcybW441/dub777-A-woman-in-a-shiny-latex-suit-full-body-shot-drawn-in-b8ff18fe-dcfa-4d4c-8aff-0063516770c9-0.png',
    'https://i.ibb.co/Mxwq81q6/dub777-httpss-mj-runw-Si-UDyy-Hsu-M-Hajime-Sorayama-perfect-blue-3fc5ce4c-0dda-4ff6-8303-f9e634b0ac2.png',
    'https://i.ibb.co/jPX9Ydkq/dub777-A-semi-realistic-digital-painting-in-the-style-of-Roma-1b75eb8d-b0da-4249-b6ca-bec36c42e72d-0.png',
    'https://i.ibb.co/WpHY70gf/dub777-httpss-mj-run97067-O3t2-PY-She-has-a-hat-on-her-headwhic-2f47bbe7-4022-4db9-8124-400a80a03567-0.png',
    'https://i.ibb.co/dJzQrD6n/dub777-A-black-cat-with-large-round-eyes-prominent-whiskers-a-3e24cbeb-a661-419b-a11a-8f313be07cd1-1.png',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

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

  const handleNextToGenerator = () => {
    if (!imagePreview || !imageFile || !characterName.trim() || !creatorName.trim()) return;

    if (!canGenerateCertificate()) {
      setShowPaywall(true);
      return;
    }

    const canvas = document.createElement('canvas');
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
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

      setShowForgingAnimation(true);
    };
    img.src = imagePreview;
  };

  const handleAnimationComplete = useCallback(() => {
    console.log('handleAnimationComplete called');
    setShowForgingAnimation(false);
    console.log('Navigating to /card-generator');
    navigate('/card-generator');
  }, [navigate]);

  const handleActivateLicense = async (key: string): Promise<boolean> => {
    const result = await validateAndActivateLicense(key);

    if (result.success) {
      setRemainingFree(getRemainingFreeCertificates());
      return true;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white relative overflow-hidden">
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
          <div className="mb-32 relative">
            <div className="relative w-full max-w-6xl mx-auto rounded-2xl overflow-hidden border border-blue-500/30 shadow-2xl" style={{ aspectRatio: '16/9' }}>
              {heroImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Virtual identity showcase ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>
              ))}

              <div className="absolute top-6 right-6 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                  <Shield className="w-16 h-16 sm:w-20 sm:h-20 text-white/80 relative z-10 drop-shadow-2xl" strokeWidth={2} />
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6 z-20">
                <p className="text-white text-lg sm:text-xl font-medium drop-shadow-2xl whitespace-nowrap overflow-hidden text-ellipsis">
                  {t('hero.carouselText')}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#171717] to-transparent pointer-events-none" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight whitespace-nowrap">
            {t('hero.title')}
            {t('hero.titleHighlight')}
          </h2>
          <p className="text-xl text-white max-w-3xl mx-auto leading-relaxed mb-8">
            {t('hero.subtitle')}
          </p>
          <button
            onClick={() => document.getElementById('submission')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
          >
            {t('hero.cta')}
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
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

                <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-green-400">{t('form.privacyGuard')}</span> {t('form.privacyText')}
                  </p>
                </div>

                {!hasValidLicense() && remainingFree > 0 && (
                  <div className="mb-6 text-center text-sm text-slate-400">
                    {t('form.freeRemaining', { count: remainingFree })}
                  </div>
                )}

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
                          onChange={(e) => setCharacterName(e.target.value)}
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
                          onChange={(e) => setCreatorName(e.target.value)}
                          placeholder="e.g., Alex Chen"
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleEditInfo}
                      disabled={!imageFile}
                      className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
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
                            src={imagePreview}
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
                        disabled={!characterName.trim() || !creatorName.trim()}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                      >
                        Next
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

            <div className="text-center text-slate-600 text-sm pt-6">
              <p>{t('footer.copyright')}</p>
            </div>
          </div>
        </footer>
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onActivate={handleActivateLicense}
      />

      {showForgingAnimation && (
        <ForgingAnimation
          avatarUrl={imagePreview}
          characterName={characterName}
          onComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
}

export default App;
