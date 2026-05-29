import { useState, useEffect, useCallback } from 'react';
import { Upload, Shield, FileCheck, ChevronDown, X, Gift, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { calculateSHA256 } from './utils/sha256';
import { uploadImageToStorage, uploadOriginalFileToStorage } from './utils/imageUpload';
import { AnimatedGrid } from './components/AnimatedGrid';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ForgingAnimation } from './components/ForgingAnimation';
import { PaywallModal } from './components/PaywallModal';
import { AuthControl, type AuthSessionState } from './components/AuthControl';
import {
  clearSavedActivationCode,
  consumeActivationCode,
  getActivationCodeInfo,
  getSavedActivationCode,
  markGenerationReady,
  getRemainingFreeCertificates,
  normalizeActivationCode,
  supabase,
  type ActivationCodeInfo,
} from './utils/licenseManager';
import './i18n/config';

const HERO_LIGHT_BG_SRC = '/hero_light_bg.webp';
const HERO_FIGURE_SRC = '/hero_figure.webp';
const HERO_FIGURE_MOBILE_SRC = '/hero_figure_mobile.webp';
const HERO_BACKGROUND_VIDEO_SRC = '/hero-background-video.mp4';
const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_FILE_MB = MAX_IMAGE_FILE_BYTES / (1024 * 1024);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const LAUNCH_BENEFIT_DISMISSED_KEY = 'vaid-launch-benefit-dismissed-v4';

function HeroHudFrame() {
  const innerContainerFillPath =
    'M46,34 H330 L346,47 H654 L670,34 H954 Q966,34 966,46 V376 Q966,388 954,388 H46 Q34,388 34,376 V46 Q34,34 46,34 Z';
  const innerContainerStrokePath =
    'M46,34 H330 L346,47 H654 L670,34 H954 Q966,34 966,46 V376 Q966,388 954,388 H660 M340,388 H46 Q34,388 34,376 V46 Q34,34 46,34';

  return (
    <svg
      width="100%"
      viewBox="0 0 1000 460"
      role="img"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="hero-gdepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2b53" stopOpacity="0.0288" />
          <stop offset="58%" stopColor="#121f43" stopOpacity="0.0461" />
          <stop offset="100%" stopColor="#0b1430" stopOpacity="0.0576" />
        </linearGradient>
        <linearGradient id="hero-gbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1fbff" stopOpacity="0.0634" />
          <stop offset="52%" stopColor="#d2e3ff" stopOpacity="0.049" />
          <stop offset="100%" stopColor="#9db4e7" stopOpacity="0.0346" />
        </linearGradient>
        <linearGradient id="hero-gshine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfeff" stopOpacity="0.0346" />
          <stop offset="38%" stopColor="#e2f0ff" stopOpacity="0.0187" />
          <stop offset="100%" stopColor="#9fb8e8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-top-left-neon" x1="32" y1="20" x2="186" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52f4ff" stopOpacity="0" />
          <stop offset="22%" stopColor="#5cf7ff" stopOpacity="1" />
          <stop offset="58%" stopColor="#39baff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#685dff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-bottom-notch-neon" x1="360" y1="384" x2="636" y2="384" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52f4ff" stopOpacity="0" />
          <stop offset="16%" stopColor="#4275ff" stopOpacity="0.36" />
          <stop offset="34%" stopColor="#72f8ff" stopOpacity="0.76" />
          <stop offset="50%" stopColor="#e1fdff" stopOpacity="0.96" />
          <stop offset="66%" stopColor="#72f8ff" stopOpacity="0.76" />
          <stop offset="84%" stopColor="#4275ff" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#52f4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-inner-notch-neon" x1="398" y1="47" x2="626" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52f4ff" stopOpacity="0" />
          <stop offset="15%" stopColor="#4275ff" stopOpacity="0.28" />
          <stop offset="32%" stopColor="#72f8ff" stopOpacity="0.72" />
          <stop offset="50%" stopColor="#e1fdff" stopOpacity="0.95" />
          <stop offset="68%" stopColor="#72f8ff" stopOpacity="0.72" />
          <stop offset="85%" stopColor="#4275ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#52f4ff" stopOpacity="0" />
        </linearGradient>
        <filter id="hero-corner-neon" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hero-notch-neon" x="-40%" y="-700%" width="180%" height="1500%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line x1="20" y1="32" x2="32" y2="20" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="32" y1="20" x2="968" y2="20" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="968" y1="20" x2="980" y2="32" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="980" y1="32" x2="980" y2="390" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="980" y1="390" x2="968" y2="402" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="968" y1="402" x2="660" y2="402" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="660" y1="402" x2="642" y2="384" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="642" y1="384" x2="358" y2="384" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="358" y1="384" x2="340" y2="402" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="340" y1="402" x2="32" y2="402" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="32" y1="402" x2="20" y2="390" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />
      <line x1="20" y1="32" x2="20" y2="390" stroke="#7f8796" strokeWidth="1.3" opacity={0.46} />

      <g strokeLinecap="round" fill="none">
        <g stroke="#54f4ff" strokeWidth="5.2" opacity={0.22} filter="url(#hero-corner-neon)">
          <line x1="20" y1="32" x2="32" y2="20" />
          <line x1="968" y1="20" x2="980" y2="32" />
          <line x1="980" y1="390" x2="968" y2="402" />
          <line x1="32" y1="402" x2="20" y2="390" />
        </g>
        <g stroke="#8ff8ff" strokeWidth="2.15" opacity={0.88}>
          <line x1="20" y1="32" x2="32" y2="20" />
          <line x1="968" y1="20" x2="980" y2="32" />
          <line x1="980" y1="390" x2="968" y2="402" />
          <line x1="32" y1="402" x2="20" y2="390" />
        </g>
      </g>

      <g strokeLinecap="round" fill="none">
        <g filter="url(#hero-corner-neon)">
          <line x1="32" y1="20" x2="186" y2="20" stroke="url(#hero-top-left-neon)" strokeWidth="7.4" opacity={0.48} />
        </g>
        <line x1="32" y1="20" x2="186" y2="20" stroke="url(#hero-top-left-neon)" strokeWidth="2.65" opacity={0.96} />
      </g>

      <path
        d={innerContainerFillPath}
        fill="url(#hero-gdepth)"
      />
      <path
        d={innerContainerFillPath}
        fill="url(#hero-gbg)"
      />
      <path
        d={innerContainerFillPath}
        fill="url(#hero-gshine)"
      />
      <path
        d={innerContainerStrokePath}
        fill="none"
        stroke="#b5edff"
        strokeWidth="1"
        opacity={0.3}
      />
      <g stroke="#7f8796" strokeWidth="1.3" fill="none" opacity={0.46}>
        <line x1="660" y1="402" x2="642" y2="384" />
        <line x1="642" y1="384" x2="358" y2="384" />
        <line x1="358" y1="384" x2="340" y2="402" />
      </g>

      <g strokeLinecap="round" fill="none">
        <g filter="url(#hero-notch-neon)">
          <line x1="398" y1="47" x2="626" y2="47" stroke="url(#hero-inner-notch-neon)" strokeWidth="7.2" opacity={0.34} />
          <line x1="360" y1="384" x2="636" y2="384" stroke="url(#hero-bottom-notch-neon)" strokeWidth="7.6" opacity={0.38} />
        </g>
        <line x1="398" y1="47" x2="626" y2="47" stroke="url(#hero-inner-notch-neon)" strokeWidth="2.15" opacity={0.82} />
        <line x1="442" y1="47" x2="582" y2="47" stroke="url(#hero-inner-notch-neon)" strokeWidth="1.15" opacity={0.95} />
        <line x1="360" y1="384" x2="636" y2="384" stroke="url(#hero-bottom-notch-neon)" strokeWidth="2.35" opacity={0.86} />
        <line x1="388" y1="384" x2="606" y2="384" stroke="url(#hero-bottom-notch-neon)" strokeWidth="1.15" opacity={0.95} />
      </g>

      <g fill="#2f4774" opacity="0.74">
        <polygon points="272,34 284,34 297,47 285,47" />
        <polygon points="286,34 298,34 311,47 299,47" />
        <polygon points="300,34 312,34 325,47 313,47" />
        <polygon points="314,34 326,34 339,47 327,47" opacity="0.5" />
      </g>

      <g fill="#2f4774" opacity="0.74">
        <polygon points="674,34 682,34 669,47 661,47" opacity="0.5" />
        <polygon points="686,34 698,34 685,47 673,47" />
        <polygon points="700,34 712,34 699,47 687,47" />
        <polygon points="714,34 726,34 713,47 701,47" />
      </g>
    </svg>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const heroLanguage = i18n.resolvedLanguage ?? i18n.language;
  const heroLanguageTag = heroLanguage.startsWith('zh') ? 'zh' : heroLanguage.startsWith('ja') ? 'ja' : 'latin';
  const isCjkHero = heroLanguageTag !== 'latin';
  const heroTitleLinesValue = t('hero.titleLines', { returnObjects: true });
  const heroTitleLines = Array.isArray(heroTitleLinesValue) && heroTitleLinesValue.every((line) => typeof line === 'string')
    ? heroTitleLinesValue
    : [t('hero.title'), t('hero.titleHighlight')];
  const heroMobileTitleLinesValue = t('hero.mobileTitleLines', { returnObjects: true });
  const heroMobileTitleLines = Array.isArray(heroMobileTitleLinesValue) && heroMobileTitleLinesValue.every((line) => typeof line === 'string')
    ? heroMobileTitleLinesValue
    : heroTitleLines;
  const heroSubtitleLines = t('hero.subtitle').split('\n');
  const heroMobileSubtitleLinesValue = t('hero.mobileSubtitleLines', { returnObjects: true });
  const heroMobileSubtitleLines = Array.isArray(heroMobileSubtitleLinesValue) && heroMobileSubtitleLinesValue.every((line) => typeof line === 'string')
    ? heroMobileSubtitleLinesValue
    : heroSubtitleLines;
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [croppedAvatarPreview, setCroppedAvatarPreview] = useState<string | null>(null);
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
  const [authOpenSignal, setAuthOpenSignal] = useState(0);
  const [authState, setAuthState] = useState<AuthSessionState>({
    user: null,
    emailConfirmed: false,
    loading: true,
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [showLaunchBenefit, setShowLaunchBenefit] = useState(false);

  useEffect(() => {
    setShowLaunchBenefit(localStorage.getItem(LAUNCH_BENEFIT_DISMISSED_KEY) !== '1');
  }, []);

  const dismissLaunchBenefit = useCallback(() => {
    localStorage.setItem(LAUNCH_BENEFIT_DISMISSED_KEY, '1');
    setShowLaunchBenefit(false);
  }, []);


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

    if (!authState.loading && authState.user && authState.emailConfirmed) {
      refreshAccessDashboard(savedCode);
    } else if (!authState.loading) {
      setRemainingCredits(null);
      setActivationCodeInfo(null);
    }
  }, [authState.emailConfirmed, authState.loading, authState.user, refreshAccessDashboard]);

  useEffect(() => {
    const syncDashboard = () => {
      if (!authState.user || !authState.emailConfirmed) {
        return;
      }
      const preferredCode = activationCodeInput.trim() || getSavedActivationCode();
      refreshAccessDashboard(preferredCode);
    };

    const handleFocus = () => syncDashboard();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDashboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activationCodeInput, authState.emailConfirmed, authState.user, refreshAccessDashboard]);

  const handleRedeemActivationCode = useCallback(async (codeOverride?: string) => {
    if (!authState.user) {
      setGenerationError(t('errors.loginRequired'));
      setAuthOpenSignal((value) => value + 1);
      return null;
    }

    if (!authState.emailConfirmed) {
      setGenerationError(t('errors.emailNotConfirmed'));
      setAuthOpenSignal((value) => value + 1);
      return null;
    }

    const rawCode = (codeOverride ?? activationCodeInput).trim();
    if (!rawCode) {
      setActivationCodeError(t('errors.enterActivationCode'));
      return false;
    }

    setIsCheckingActivationCode(true);
    setActivationCodeError('');

    try {
      const redeemResult = await consumeActivationCode(rawCode);

      if (!redeemResult.success) {
        setActivationCodeInfo(null);
        clearSavedActivationCode();
        setActivationCodeError(t('errors.activationUnavailable'));
        return false;
      }

      setActivationCodeInput('');
      setActivationCodeInfo(null);
      setActivationCodeError('');
      await refreshAccessDashboard();
      return true;
    } finally {
      setIsCheckingActivationCode(false);
    }
  }, [activationCodeInput, authState.emailConfirmed, authState.user, refreshAccessDashboard, t]);

  const handleImageChange = (file: File) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageFile(null);
      setImagePreview(null);
      setCroppedAvatarPreview(null);
      setGenerationError(t('errors.unsupportedImageType'));
      return;
    }

    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setImageFile(null);
      setImagePreview(null);
      setCroppedAvatarPreview(null);
      setGenerationError(t('errors.imageTooLarge', { size: `${MAX_IMAGE_FILE_MB}MB` }));
      return;
    }

    setGenerationError('');
    setImageFile(file);
    setCroppedAvatarPreview(null);
    localStorage.removeItem('vid_original_file_hash');
    localStorage.removeItem('vid_original_file_path');
    localStorage.removeItem('vid_registered_friendly_id');
    localStorage.removeItem('vid_registered_hash');
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleContactSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactStatus('sending');

    const { error } = await supabase.functions.invoke('contact-submit', {
      body: {
        name: contactName,
        email: contactEmail,
        message: contactMessage,
        page_url: window.location.href,
        language: i18n.resolvedLanguage ?? i18n.language,
      },
    });

    if (error) {
      setContactStatus('error');
      return;
    }

    setContactStatus('sent');
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  }, [contactEmail, contactMessage, contactName, i18n.language, i18n.resolvedLanguage]);

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
      setGenerationError(t('errors.fillNames'));
      return;
    }
    setGenerationError('');
    setIsEditing(true);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingImage) return;
    e.preventDefault();
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleImagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDraggingImage(false);
  };

  const handleScaleChange = (newScale: number) => {
    setImageScale(Math.max(0.5, Math.min(3, newScale)));
  };

  const handleNextToGenerator = async () => {
    if (isSubmittingNext) return;

    if (!imagePreview || !imageFile) {
      setGenerationError(t('errors.uploadImage'));
      return;
    }

    if (!characterName.trim() || !creatorName.trim()) {
      setGenerationError(t('errors.returnFillNames'));
      return;
    }

    setGenerationError('');
    setIsSubmittingNext(true);

    try {
      if (authState.loading) {
        setIsSubmittingNext(false);
        return;
      }

      if (!authState.user) {
        setGenerationError(t('errors.loginRequired'));
        setAuthOpenSignal((value) => value + 1);
        setIsSubmittingNext(false);
        return;
      }

      if (!authState.emailConfirmed) {
        setGenerationError(t('errors.emailNotConfirmed'));
        setAuthOpenSignal((value) => value + 1);
        setIsSubmittingNext(false);
        return;
      }

      const normalizedInput = normalizeActivationCode(activationCodeInput);
      if (activationCodeInput.trim() && normalizedInput !== activationCodeInput) {
        setActivationCodeInput(normalizedInput);
      }

      const { freeRemaining, savedCodeInfo } = await refreshAccessDashboard(normalizedInput);
      let activeActivationCode = savedCodeInfo ?? activationCodeInfo;

      // Free quota takes priority. Only check activation code after free quota is exhausted.
      if (freeRemaining <= 0 && normalizedInput) {
        activeActivationCode = await getActivationCodeInfo(normalizedInput);
        setActivationCodeInfo(activeActivationCode);
      } else if (freeRemaining > 0) {
        setActivationCodeError('');
      }

      const hasUsableActivationCode = !!activeActivationCode
        && activeActivationCode.status === 'active'
        && activeActivationCode.remaining_uses > 0;

      if (freeRemaining <= 0 && !hasUsableActivationCode) {
        if (!activeActivationCode && normalizedInput) {
          setActivationCodeError(t('errors.activationNotFound'));
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
        setCroppedAvatarPreview(croppedAvatar);
        localStorage.setItem('vid_uploaded_avatar', croppedAvatar);
        localStorage.setItem('vid_character_name', characterName);
        localStorage.setItem('vid_creator_name', creatorName);

        try {
          const hash = await calculateSHA256(imageFile);

          let refreshedState = await refreshAccessDashboard(normalizedInput);

          if (refreshedState.freeRemaining <= 0 && normalizedInput) {
            const redeemResult = await consumeActivationCode(normalizedInput);
            if (!redeemResult.success) {
              setActivationCodeError(t('errors.activationUnavailable'));
            } else {
              setActivationCodeInput('');
              setActivationCodeError('');
              refreshedState = await refreshAccessDashboard();
            }
          }

          if (refreshedState.freeRemaining <= 0) {
            setShowPaywall(true);
            setIsSubmittingNext(false);
            return;
          }

          const originalFilePath = await uploadOriginalFileToStorage(imageFile);
          if (!originalFilePath) {
            setGenerationError(t('errors.generationFlowFailed'));
            return;
          }

          const uploadedAvatarUrl = await uploadImageToStorage(croppedAvatar);
          if (!uploadedAvatarUrl) {
            setGenerationError(t('errors.generationFlowFailed'));
            return;
          }

          const { data: registerData, error: registerError } = await supabase.functions.invoke('v-id-register', {
            body: {
              character_name: characterName,
              creator_name: creatorName,
              sha256_hash: hash,
              image_url: uploadedAvatarUrl,
              original_file_path: originalFilePath,
            },
          });

          if (registerError || !registerData?.success || !registerData?.friendly_id) {
            console.error('Failed to register VAID before card preview:', registerError || registerData);
            setGenerationError(t('errors.generationFlowFailed'));
            return;
          }

          localStorage.setItem('vid_original_file_hash', hash);
          localStorage.setItem('vid_registered_friendly_id', registerData.friendly_id);
          localStorage.setItem('vid_registered_hash', hash);
          setRemainingCredits(Number(registerData.free_credits || 0) + Number(registerData.paid_credits || 0));
          setActivationCodeInfo(refreshedState.savedCodeInfo);
          setActivationCodeError('');
          setGenerationError('');
          markGenerationReady();
          setShowForgingAnimation(true);
        } catch (error) {
          console.error('Failed to prepare generation flow:', error);
          setGenerationError(t('errors.generationFlowFailed'));
        } finally {
          setIsSubmittingNext(false);
        }
      };

      img.onerror = () => {
        setGenerationError(t('errors.imageReadFailed'));
        setIsSubmittingNext(false);
      };

      img.src = imagePreview;
    } catch (error) {
      console.error('Failed to check generation prerequisites:', error);
      setGenerationError(t('errors.quotaStatusFailed'));
      setIsSubmittingNext(false);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setShowForgingAnimation(false);
    navigate('/card-generator');
  }, [navigate]);

  useEffect(() => {
    const scrollToSubmission = () => {
      if (window.location.hash !== '#submission') return;

      window.requestAnimationFrame(() => {
        document.getElementById('submission')?.scrollIntoView({ behavior: 'smooth' });
      });
    };

    scrollToSubmission();
    window.addEventListener('hashchange', scrollToSubmission);
    return () => window.removeEventListener('hashchange', scrollToSubmission);
  }, []);

  const usableActivationRemaining =
    activationCodeInfo && activationCodeInfo.status === 'active' && activationCodeInfo.remaining_uses > 0
      ? activationCodeInfo.remaining_uses
      : 0;
  const remainingCountForDisplay =
    remainingCredits === null
      ? null
      : (remainingCredits > 0 ? remainingCredits : usableActivationRemaining);
  const hasRemainingCount = (remainingCountForDisplay ?? 0) > 0;
  const processSteps = [
    { id: 'step1', Icon: Upload },
    { id: 'step2', Icon: Shield },
    { id: 'step3', Icon: FileCheck },
    { id: 'step4', Icon: Shield },
  ];

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center sm:hidden"
          style={{ backgroundImage: `url(${HERO_LIGHT_BG_SRC})` }}
        />
        <video
          className="absolute inset-0 hidden h-full w-full object-cover sm:block"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={HERO_LIGHT_BG_SRC}
        >
          <source src={HERO_BACKGROUND_VIDEO_SRC} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(
                to bottom,
                rgba(35, 70, 150, 0.09) 0%,
                rgba(35, 70, 150, 0.11) 48%,
                rgba(24, 58, 132, 0.1) 100%
              ),
              linear-gradient(
                to bottom,
                rgba(4, 7, 24, 0.18) 0%,
                rgba(4, 7, 24, 0.46) 48%,
                rgba(4, 7, 24, 0.78) 62%,
                rgba(4, 7, 24, 0.94) 74%,
                #040718 100%
              )
            `,
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
          }}
        />
      </div>
      <AnimatedGrid />

      {showLaunchBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/36 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-cyan-200/45 bg-[#07111f]/95 px-7 py-10 text-center shadow-[0_0_64px_rgba(34,211,238,0.22)] sm:px-8 sm:py-12">
            <button
              type="button"
              onClick={dismissLaunchBenefit}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full border border-cyan-100/25 bg-white/5 p-2 text-cyan-100 transition-colors hover:border-cyan-200/70 hover:bg-cyan-200/10"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100 to-transparent" />
            <div className="mb-6 flex items-center justify-center gap-4 text-cyan-100" aria-hidden="true">
              <Sparkles className="h-5 w-5 opacity-80" />
              <span className="rounded-full border border-cyan-200/35 bg-cyan-200/10 p-3 shadow-[0_0_28px_rgba(125,249,255,0.18)]">
                <Gift className="h-7 w-7" />
              </span>
              <Sparkles className="h-5 w-5 opacity-80" />
            </div>
            <h2 className="mx-auto pr-8 text-xl font-black leading-tight text-white sm:pr-0 sm:text-2xl">
              Limited-Time Free Access: Create Your First VAID Digital ID
            </h2>
            <div className="mx-auto my-7 h-px w-32 bg-cyan-100/30" />
            <p className="mx-auto text-2xl font-black leading-tight text-cyan-100 sm:text-3xl">
              限时免费：免费生成你的第一份 VAID 数字身份证
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="vaid-site-header pt-8 pb-4 flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/vaid-logo-top.png"
              alt="VAID Logo"
              className="vaid-site-logo h-8 sm:h-10 md:h-[48px] w-auto max-w-[280px] mix-blend-screen"
            />
          </div>
          <div className="vaid-site-actions flex items-center gap-2 sm:gap-3">
            <AuthControl
              openSignal={authOpenSignal}
              onAuthChange={setAuthState}
            />
            <LanguageSwitcher />
          </div>
        </header>

        <section className="vaid-hero-section py-20 text-center">
          <div className="vaid-hero relative w-full max-w-6xl mx-auto">
            <div className="vaid-hero-shell" aria-hidden>
              <HeroHudFrame />
            </div>

            <div className={`vaid-hero-copy-panel ${isCjkHero ? `vaid-hero-copy-panel--${heroLanguageTag}` : ''}`}>
              <div className="vaid-hero-copy-body">
                <p className="vaid-hero-kicker">VAID // IDENTITY PROTOCOL</p>
                <h2 className={`vaid-hero-title vaid-hero-title--desktop ${isCjkHero ? `vaid-hero-title--cjk vaid-hero-title--${heroLanguageTag}` : 'vaid-hero-title--latin'}`}>
                  {heroTitleLines.map((line, index) => (
                    <span key={`${line}-${index}`}>{line}</span>
                  ))}
                </h2>
                <h2 className={`vaid-hero-title vaid-hero-title--mobile ${isCjkHero ? `vaid-hero-title--cjk vaid-hero-title--${heroLanguageTag}` : 'vaid-hero-title--latin'}`}>
                  {heroMobileTitleLines.map((line, index) => (
                    <span key={`${line}-${index}`}>{line}</span>
                  ))}
                </h2>
                <p className={`vaid-hero-subtitle vaid-hero-subtitle--desktop ${isCjkHero ? `vaid-hero-subtitle--cjk vaid-hero-subtitle--${heroLanguageTag}` : ''}`}>
                  {heroSubtitleLines.map((line, index) => (
                    <span key={`${line}-${index}`} className="vaid-hero-subtitle-line">
                      {line}
                      {index < heroSubtitleLines.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </p>
                <p className={`vaid-hero-subtitle vaid-hero-subtitle--mobile ${isCjkHero ? `vaid-hero-subtitle--cjk vaid-hero-subtitle--${heroLanguageTag}` : ''}`}>
                  {heroMobileSubtitleLines.map((line, index) => (
                    <span key={`${line}-${index}`} className="vaid-hero-subtitle-line">
                      {line}
                      {index < heroMobileSubtitleLines.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </p>
                <button
                  onClick={() => document.getElementById('submission')?.scrollIntoView({ behavior: 'smooth' })}
                  className="vaid-hero-cta"
                >
                  {t('hero.cta')}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <img
              src={HERO_FIGURE_SRC}
              srcSet={`${HERO_FIGURE_MOBILE_SRC} 768w, ${HERO_FIGURE_SRC} 1280w`}
              sizes="(max-width: 768px) 82vw, (max-width: 1280px) 60vw, 880px"
              alt="Cyber character portrait"
              className="vaid-hero-figure"
              loading="eager"
            />
          </div>
        </section>

        <section className="vaid-process-section -mt-20 pt-16 pb-10">
          <h3 className="text-3xl font-bold text-center text-white mb-12">
            {t('process.title')}
          </h3>
          <div className="vaid-process-grid grid md:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {processSteps.map(({ id, Icon }) => (
              <article
                key={id}
                className="vaid-process-card group"
                tabIndex={0}
              >
                <div className="vaid-process-card-glow" aria-hidden />
                <div className="vaid-process-card-slice" aria-hidden />
                <div className="relative z-10">
                  <div className="vaid-process-icon">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="vaid-process-title">
                    {t(`process.${id}.title`)}
                  </h4>
                  <p className="vaid-process-copy">
                    {t(`process.${id}.desc`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="submission" className="pt-20 pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="vaid-form-panel relative p-8 rounded-2xl border">
              <div className="vaid-form-body relative">
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
                      {t('form.remaining', { count: remainingCountForDisplay })}
                    </span>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                    >
                      {t('form.buyPlan')}
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
                      placeholder={t('form.activationPlaceholder')}
                      className="vaid-activation-input flex-1 px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => handleRedeemActivationCode()}
                      disabled={isCheckingActivationCode || !activationCodeInput.trim()}
                      className="vaid-activation-button px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all sm:w-auto"
                    >
                      {isCheckingActivationCode ? t('form.verifying') : t('form.verifyActivation')}
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
                      className={`vaid-upload-zone border-2 border-dashed rounded-xl p-12 text-center transition-all ${
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
                              setCroppedAvatarPreview(null);
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
                          <label className="block">
                            <span className="vaid-upload-button px-5 py-2.5 sm:px-6 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer font-medium">
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
                          {t('form.characterName')}
                        </label>
                        <input
                          id="characterName"
                          type="text"
                          value={characterName}
                          onChange={(e) => {
                            setCharacterName(e.target.value);
                            setGenerationError('');
                          }}
                          placeholder={t('form.characterPlaceholder')}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="creatorName" className="block text-left text-base font-medium text-white mb-2">
                          {t('form.creatorName')}
                        </label>
                        <input
                          id="creatorName"
                          type="text"
                          value={creatorName}
                          onChange={(e) => {
                            setCreatorName(e.target.value);
                            setGenerationError('');
                          }}
                          placeholder={t('form.creatorPlaceholder')}
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
                          {t('form.termsPrefix')}{' '}
                          <a
                            href="/terms"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate('/terms');
                            }}
                          >
                            {t('form.terms')}
                          </a>
                          {' '}{t('form.and')}{' '}
                          <a
                            href="/privacy"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate('/privacy');
                            }}
                          >
                            {t('form.privacy')}
                          </a>
                          {t('form.termsSuffix')}
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleEditInfo}
                      disabled={!imageFile || !agreedToTerms || !characterName.trim() || !creatorName.trim()}
                      className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                      {t('form.editInfo')}
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div
                      className="vaid-avatar-editor relative w-80 h-80 mx-auto"
                      onPointerDown={handleImagePointerDown}
                      onPointerMove={handleImagePointerMove}
                      onPointerUp={handleImagePointerUp}
                      onPointerCancel={handleImagePointerUp}
                      style={{ touchAction: 'none' }}
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
                            draggable={false}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400/50 pointer-events-none" />
                    </div>

                    <div className="text-center text-slate-300">
                      <p className="mb-2">{t('form.dragAdjust')}</p>
                      <p className="text-sm text-slate-500">{t('form.scaleHint')}</p>
                    </div>

                    <div className="space-y-4 px-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-slate-400">{t('form.scale')}</label>
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
                        {t('form.resetImage')}
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
                      >
                        {t('form.back')}
                      </button>
                      <button
                        onClick={handleNextToGenerator}
                        disabled={isSubmittingNext}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                      >
                        {isSubmittingNext ? t('form.processing') : t('form.next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="vaid-footer-circuit relative overflow-hidden py-12 border-t border-slate-800">
          <div className="relative z-10 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={() => setShowContactForm(true)}
                className="px-5 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 text-sm font-semibold hover:bg-cyan-400/16 hover:border-cyan-300/50 transition-colors"
              >
                {t('footer.contact')}
              </button>

            </div>

            <nav aria-label="Documentation" className="flex justify-center text-sm text-slate-500">
              <a href="/docs" className="hover:text-cyan-200 transition-colors">
                {t('footer.docs')}
              </a>
            </nav>

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

      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/72 px-4 py-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-5 shadow-2xl shadow-cyan-950/40 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t('footer.contactTitle')}</h2>
                <p className="mt-2 text-sm text-slate-400">{t('footer.contactSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowContactForm(false);
                  setContactStatus('idle');
                }}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-cyan-400/50 hover:text-cyan-100"
              >
                {t('auth.close')}
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <input
                type="text"
                required
                maxLength={120}
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder={t('footer.contactName')}
                className="w-full rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="email"
                required
                maxLength={320}
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder={t('footer.contactEmail')}
                className="w-full rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <textarea
                required
                maxLength={4000}
                rows={5}
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                placeholder={t('footer.contactMessage')}
                className="w-full resize-none rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />

              {contactStatus === 'sent' && (
                <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                  {t('footer.contactSent')}
                </p>
              )}
              {contactStatus === 'error' && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {t('footer.contactError')}
                </p>
              )}

              <button
                type="submit"
                disabled={contactStatus === 'sending'}
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {contactStatus === 'sending' ? t('footer.contactSending') : t('footer.contactSend')}
              </button>
            </form>
          </div>
        </div>
      )}


      {showForgingAnimation && (
        <ForgingAnimation
          avatarUrl={croppedAvatarPreview || imagePreview || undefined}
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
