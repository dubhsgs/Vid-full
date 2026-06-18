import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { calculateSHA256 } from '../../utils/sha256';
import { uploadImageToStorage, uploadOriginalFileToStorage } from '../../utils/imageUpload';
import {
  isAllowedEvidenceFile,
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_FILES,
  uploadEvidenceMaterial,
} from '../../utils/evidenceUpload';
import {
  registerCreatorIdentity,
  type CreatorDocumentType,
} from '../../utils/creatorIdentity';
import {
  getSupportedDocumentTypes,
  SUPPORTED_IDENTITY_COUNTRY_CODES,
} from '../../utils/identityValidation';
import {
  clearPendingDownloadArchiveIdentity,
  setPendingDownloadArchiveIdentity,
} from '../../utils/downloadArchiveIdentity';
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
} from '../../utils/licenseManager';
import { ForgingAnimation } from '../ForgingAnimation';
import { PaywallModal } from '../PaywallModal';
import type { AuthSessionState } from '../AuthControl';

const DOWNLOAD_CARD_IMAGE_SESSION_KEY = 'vid_download_card_image_base64';
const DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY = 'vid_download_card_image_version';
const DOWNLOAD_CARD_IMAGE_VERSION = 'inter-self-hosted-20260616';
const DOWNLOAD_CREATOR_LEGAL_NAME_SESSION_KEY = 'vid_download_creator_legal_name';
const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_FILE_MB = MAX_IMAGE_FILE_BYTES / (1024 * 1024);
const MAX_EVIDENCE_FILE_MB = MAX_EVIDENCE_FILE_BYTES / (1024 * 1024);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

interface RegistrationFlowProps {
  authState: AuthSessionState;
  onAuthRequired: () => void;
}

export function RegistrationFlow({ authState, onAuthRequired }: RegistrationFlowProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [croppedAvatarPreview, setCroppedAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [countryRegion, setCountryRegion] = useState('');
  const [documentType, setDocumentType] = useState<CreatorDocumentType>('passport');
  const [documentNumber, setDocumentNumber] = useState('');
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
  const [showEvidenceStep, setShowEvidenceStep] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceUploadProgress, setEvidenceUploadProgress] = useState(0);
  const [evidenceUploadError, setEvidenceUploadError] = useState('');
  const supportedDocumentTypes = getSupportedDocumentTypes(countryRegion);
  const countryDisplayNames = new Intl.DisplayNames(
    [i18n.resolvedLanguage ?? i18n.language],
    { type: 'region' }
  );
  const identityCountryOptions = SUPPORTED_IDENTITY_COUNTRY_CODES
    .map(code => ({
      code,
      label: countryDisplayNames.of(code) || code,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, i18n.resolvedLanguage ?? i18n.language));

  useEffect(() => {
    clearPendingDownloadArchiveIdentity();
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
      onAuthRequired();
      return null;
    }

    if (!authState.emailConfirmed) {
      setGenerationError(t('errors.emailNotConfirmed'));
      onAuthRequired();
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
  }, [activationCodeInput, authState.emailConfirmed, authState.user, onAuthRequired, refreshAccessDashboard, t]);

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
    setShowEvidenceStep(false);
    setEvidenceFiles([]);
    setEvidenceUploadProgress(0);
    setEvidenceUploadError('');
    localStorage.removeItem('vid_original_file_hash');
    localStorage.removeItem('vid_original_file_path');
    localStorage.removeItem('vid_registered_friendly_id');
    localStorage.removeItem('vid_registered_hash');
    localStorage.removeItem('vid_standard_card_image_url');
    clearPendingDownloadArchiveIdentity();
    sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
    if (
      !characterName.trim()
      || !creatorName.trim()
      || !countryRegion.trim()
      || !documentNumber.trim()
    ) {
      setGenerationError(t('errors.fillArchiveDetails'));
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

    setGenerationError('');
    setIsSubmittingNext(true);

    try {
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
        setCroppedAvatarPreview(croppedAvatar);
        localStorage.setItem('vid_uploaded_avatar', croppedAvatar);
        setShowEvidenceStep(true);
        setIsSubmittingNext(false);
      };

      img.onerror = () => {
        setGenerationError(t('errors.imageReadFailed'));
        setIsSubmittingNext(false);
      };

      img.src = imagePreview;
    } catch (error) {
      console.error('Failed to prepare cropped avatar:', error);
      setGenerationError(t('errors.imageReadFailed'));
      setIsSubmittingNext(false);
    }
  };

  const finishGenerationFlow = useCallback(() => {
    markGenerationReady();
    setShowEvidenceStep(false);
    setShowForgingAnimation(true);
  }, []);

  const handleEvidenceFilesChange = (files: FileList | File[]) => {
    const incomingFiles = Array.from(files);

    if (incomingFiles.some(file => !isAllowedEvidenceFile(file))) {
      setEvidenceUploadError(t('errors.evidenceInvalidFile', { size: `${MAX_EVIDENCE_FILE_MB}MB` }));
      return;
    }

    setEvidenceUploadError('');
    setEvidenceFiles((currentFiles) => {
      const mergedFiles = [...currentFiles, ...incomingFiles];
      return mergedFiles.slice(0, MAX_EVIDENCE_FILES);
    });
  };

  const removeEvidenceFile = (index: number) => {
    setEvidenceFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmitEvidenceUpload = async (skipEvidence = false) => {
    if (isUploadingEvidence) return;

    if (!imageFile || !croppedAvatarPreview) {
      setEvidenceUploadError(t('errors.imageReadFailed'));
      return;
    }

    if (
      !characterName.trim()
      || !creatorName.trim()
      || !countryRegion.trim()
      || !documentNumber.trim()
    ) {
      setEvidenceUploadError(t('errors.fillArchiveDetails'));
      return;
    }

    if (!agreedToTerms) {
      setEvidenceUploadError(t('errors.agreeToTerms'));
      return;
    }

    if (!skipEvidence && evidenceFiles.length === 0) {
      setEvidenceUploadError(t('errors.evidenceRequired'));
      return;
    }

    if (authState.loading) {
      return;
    }

    if (!authState.user) {
      setEvidenceUploadError(t('errors.loginRequired'));
      onAuthRequired();
      return;
    }

    if (!authState.emailConfirmed) {
      setEvidenceUploadError(t('errors.emailNotConfirmed'));
      onAuthRequired();
      return;
    }

    setIsUploadingEvidence(true);
    setGenerationError('');
    setEvidenceUploadError('');
    setEvidenceUploadProgress(0);

    let currentStage: 'registration' | 'identity' | 'evidence' = 'registration';

    try {
      const normalizedInput = normalizeActivationCode(activationCodeInput);
      if (activationCodeInput.trim() && normalizedInput !== activationCodeInput) {
        setActivationCodeInput(normalizedInput);
      }

      const { freeRemaining, savedCodeInfo } = await refreshAccessDashboard(normalizedInput);
      let activeActivationCode = savedCodeInfo ?? activationCodeInfo;

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
        return;
      }

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
        return;
      }

      const originalFilePath = await uploadOriginalFileToStorage(imageFile);
      const uploadedAvatarUrl = await uploadImageToStorage(croppedAvatarPreview);
      if (!originalFilePath || !uploadedAvatarUrl) {
        throw new Error('IMAGE_UPLOAD_FAILED');
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
        throw new Error(registerData?.error || registerError?.message || 'V_ID_REGISTER_FAILED');
      }

      const friendlyId = String(registerData.friendly_id);
      currentStage = 'identity';
      await registerCreatorIdentity(
        friendlyId,
        countryRegion.trim(),
        documentType,
        documentNumber.trim()
      );

      if (!skipEvidence) {
        currentStage = 'evidence';
        for (let index = 0; index < evidenceFiles.length; index += 1) {
          const file = evidenceFiles[index];
          const fileBaseProgress = (index / evidenceFiles.length) * 100;
          const fileProgressShare = 100 / evidenceFiles.length;
          setEvidenceUploadProgress(Math.round(fileBaseProgress));
          await uploadEvidenceMaterial(friendlyId, file, ({ percent }) => {
            setEvidenceUploadProgress(Math.round(fileBaseProgress + (fileProgressShare * percent) / 100));
          });
          setEvidenceUploadProgress(Math.round(((index + 1) / evidenceFiles.length) * 100));
        }
      }

      localStorage.setItem('vid_uploaded_avatar', croppedAvatarPreview);
      localStorage.setItem('vid_character_name', characterName);
      localStorage.setItem('vid_creator_name', creatorName);
      localStorage.setItem('vid_original_file_hash', hash);
      localStorage.setItem('vid_registered_friendly_id', friendlyId);
      localStorage.setItem('vid_registered_hash', hash);
      sessionStorage.setItem(DOWNLOAD_CREATOR_LEGAL_NAME_SESSION_KEY, creatorName);
      setPendingDownloadArchiveIdentity({
        creatorDocumentNumber: documentNumber,
      });
      if (registerData.card_image_url) {
        localStorage.setItem('vid_standard_card_image_url', String(registerData.card_image_url));
      } else {
        localStorage.removeItem('vid_standard_card_image_url');
      }
      if (registerData.card_download_image_base64) {
        try {
          sessionStorage.setItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY, String(registerData.card_download_image_base64));
          sessionStorage.setItem(DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY, DOWNLOAD_CARD_IMAGE_VERSION);
        } catch (storageError) {
          console.warn('[App] Failed to store one-time lossless card image:', storageError);
          sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY);
          sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY);
        }
      } else {
        sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_SESSION_KEY);
        sessionStorage.removeItem(DOWNLOAD_CARD_IMAGE_VERSION_SESSION_KEY);
      }
      setRemainingCredits(Number(registerData.free_credits || 0) + Number(registerData.paid_credits || 0));
      setActivationCodeInfo(refreshedState.savedCodeInfo);
      setActivationCodeError('');
      setEvidenceFiles([]);
      setEvidenceUploadProgress(0);
      finishGenerationFlow();
    } catch (error) {
      console.error(`Failed during ${currentStage}:`, error);
      const errorMessage = error instanceof Error ? error.message : '';
      setEvidenceUploadError(
        currentStage === 'identity'
          ? (
            errorMessage === 'INVALID_IDENTITY_DOCUMENT'
            || errorMessage === 'UNSUPPORTED_IDENTITY_DOCUMENT'
            || errorMessage === 'INVALID_COUNTRY_REGION'
            || errorMessage === 'INVALID_DOCUMENT_TYPE'
            || errorMessage === 'INVALID_DOCUMENT_NUMBER'
              ? t('errors.invalidIdentityDocument')
              : errorMessage
                ? `${t('errors.identitySaveFailed')}（${errorMessage}）`
                : t('errors.identitySaveFailed')
          )
          : currentStage === 'evidence'
            ? t('errors.evidenceUploadFailed')
            : errorMessage === 'DUPLICATE_HASH_OWNED_BY_ANOTHER_USER'
              ? t('errors.duplicateHashOwnedByAnotherUser')
              : t('errors.generationFlowFailed')
      );
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleSkipEvidenceUpload = () => {
    if (!window.confirm(t('form.evidenceSkipConfirm'))) return;
    void handleSubmitEvidenceUpload(true);
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

  return (
    <>
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

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                      <div>
                        <label htmlFor="characterName" className="block text-left text-base font-medium text-white mb-2">
                          {t('form.characterName')}
                        </label>
                        <input
                          id="characterName"
                          type="text"
                          value={characterName}
                          onChange={(event) => {
                            setCharacterName(event.target.value);
                            setGenerationError('');
                          }}
                          placeholder={t('form.characterPlaceholder')}
                          className="vaid-identity-control w-full bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                          onChange={(event) => {
                            setCreatorName(event.target.value);
                            setGenerationError('');
                          }}
                          placeholder={t('form.creatorPlaceholder')}
                          className="vaid-identity-control w-full bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="countryRegion" className="block text-left text-base font-medium text-white mb-2">
                          {t('form.countryRegion')}
                        </label>
                        <div className="relative">
                          <select
                            id="countryRegion"
                            value={countryRegion}
                            onChange={(event) => {
                              const nextCountry = event.target.value;
                              const nextTypes = getSupportedDocumentTypes(nextCountry);
                              setCountryRegion(nextCountry);
                              setDocumentType(nextTypes[0] || 'passport');
                              setDocumentNumber('');
                              setGenerationError('');
                            }}
                            className="vaid-identity-control vaid-identity-select w-full bg-[#0a0a0a] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option value="">{t('form.countryRegionPlaceholder')}</option>
                            {identityCountryOptions.map(country => (
                              <option key={country.code} value={country.code}>{country.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="vaid-identity-select-icon" aria-hidden="true" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="documentType" className="block text-left text-base font-medium text-white mb-2">
                          {t('form.documentType')}
                        </label>
                        <div className="relative">
                          <select
                            id="documentType"
                            value={documentType}
                            onChange={(event) => {
                              setDocumentType(event.target.value as CreatorDocumentType);
                              setDocumentNumber('');
                              setGenerationError('');
                            }}
                            disabled={!countryRegion}
                            className="vaid-identity-control vaid-identity-select w-full bg-[#0a0a0a] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            {supportedDocumentTypes.map(type => (
                              <option key={type} value={type}>
                                {type === 'national_id'
                                  ? t('form.documentTypeNationalId')
                                  : t('form.documentTypePassport')}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="vaid-identity-select-icon" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label htmlFor="documentNumber" className="block text-left text-base font-medium text-white mb-2">
                        {t('form.documentNumber')}
                      </label>
                      <input
                        id="documentNumber"
                        type="text"
                        value={documentNumber}
                        onChange={(event) => {
                          setDocumentNumber(event.target.value);
                          setGenerationError('');
                        }}
                        placeholder={t('form.documentNumberPlaceholder')}
                        autoComplete="off"
                        className="vaid-identity-control w-full bg-[#0a0a0a] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <button
                      onClick={handleEditInfo}
                      disabled={
                        !imageFile
                        || !characterName.trim()
                        || !creatorName.trim()
                        || !countryRegion.trim()
                        || !documentNumber.trim()
                      }
                      className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                      {t('form.next')}
                    </button>
                  </>
                ) : showEvidenceStep ? (
                  <div className="space-y-6">
                    <div>
                      <label className="vaid-upload-zone flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 p-12 text-center transition-all hover:border-blue-400">
                        <span className="block text-lg font-semibold text-white">{t('form.evidenceTitle')}</span>
                        <span className="mt-4 block text-sm text-slate-500">
                          {t('form.evidenceLimit', { count: MAX_EVIDENCE_FILES, size: `${MAX_EVIDENCE_FILE_MB}MB` })}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
                          onChange={(event) => {
                            if (event.target.files) handleEvidenceFilesChange(event.target.files);
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        {t('form.evidenceTips')}
                      </p>

                      {evidenceFiles.length > 0 && (
                        <div className="mt-5 space-y-3">
                          {evidenceFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${file.size}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)}MB</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeEvidenceFile(index)}
                                disabled={isUploadingEvidence}
                                className="rounded-full border border-slate-700 p-2 text-slate-300 transition-colors hover:border-red-400/50 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={t('form.evidenceRemove')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {evidenceUploadError && (
                        <div className="mt-5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          {evidenceUploadError}
                        </div>
                      )}

                      {isUploadingEvidence && (
                        <div className="mt-5">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full bg-cyan-300 ${
                                evidenceFiles.length > 0
                                  ? 'transition-all duration-300'
                                  : 'vaid-indeterminate-progress'
                              }`}
                              style={evidenceFiles.length > 0
                                ? { width: `${Math.max(evidenceUploadProgress, 8)}%` }
                                : undefined}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex-shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(event) => {
                            setAgreedToTerms(event.target.checked);
                            setEvidenceUploadError('');
                          }}
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
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          {t('form.terms')}
                        </a>
                        {' '}{t('form.and')}{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          {t('form.privacy')}
                        </a>
                        {t('form.termsSuffix')}
                      </span>
                    </label>

                    <div className="flex gap-4">
                      <button
                        onClick={handleSkipEvidenceUpload}
                        disabled={isUploadingEvidence}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                      >
                        {t('form.evidenceSkip')}
                      </button>
                      <button
                        onClick={() => void handleSubmitEvidenceUpload(false)}
                        disabled={isUploadingEvidence}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                      >
                        {isUploadingEvidence ? t('form.evidenceUploading') : t('form.evidenceContinue')}
                      </button>
                    </div>
                  </div>
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
                    {isSubmittingNext && (
                      <p className="text-center text-sm text-slate-400">
                        {t('form.processingHint')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
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
    </>
  );
}
