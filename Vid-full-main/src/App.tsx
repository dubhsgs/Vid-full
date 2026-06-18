import { useCallback, useEffect, useState } from 'react';
import { FileCheck, Shield, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedGrid } from './components/AnimatedGrid';
import { AuthControl, type AuthSessionState } from './components/AuthControl';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ContactModal } from './components/home/ContactModal';
import { HomeHero } from './components/home/HomeHero';
import { RegistrationFlow } from './components/home/RegistrationFlow';
import './i18n/config';

const HERO_LIGHT_BG_SRC = '/hero_light_bg.webp';
const HERO_BACKGROUND_VIDEO_SRC = '/hero-background-video.mp4';
const CHINESE_LANGUAGE_PROMPT_SESSION_KEY = 'vaid-chinese-language-prompt-shown-v1';

function App() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [authOpenSignal, setAuthOpenSignal] = useState(0);
  const [authState, setAuthState] = useState<AuthSessionState>({
    user: null,
    emailConfirmed: false,
    loading: true,
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [showChineseLanguagePrompt, setShowChineseLanguagePrompt] = useState(false);

  useEffect(() => {
    if (!currentLanguage.startsWith('en')) return;

    try {
      if (window.sessionStorage.getItem(CHINESE_LANGUAGE_PROMPT_SESSION_KEY) === '1') return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      if ((i18n.resolvedLanguage ?? i18n.language).startsWith('en')) {
        setShowChineseLanguagePrompt(true);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [currentLanguage, i18n]);

  const closeChineseLanguagePrompt = useCallback(() => {
    try {
      window.sessionStorage.setItem(CHINESE_LANGUAGE_PROMPT_SESSION_KEY, '1');
    } catch {
      // Keep the prompt dismissible even if session storage is unavailable.
    }
    setShowChineseLanguagePrompt(false);
  }, []);

  const switchToChinese = useCallback(() => {
    closeChineseLanguagePrompt();
    void i18n.changeLanguage('zh');
  }, [closeChineseLanguagePrompt, i18n]);

  const processSteps = [
    { id: 'step1', Icon: Upload },
    { id: 'step2', Icon: Shield },
    { id: 'step3', Icon: FileCheck },
    { id: 'step4', Icon: Shield },
  ];

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <video
          className="absolute inset-0 h-full w-full object-cover"
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

      {showChineseLanguagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chinese-language-prompt-title"
            className="w-full max-w-sm rounded-xl border border-cyan-300/25 bg-slate-950/95 p-6 text-center shadow-2xl shadow-cyan-950/40"
          >
            <h2 id="chinese-language-prompt-title" className="text-xl font-bold text-white">
              是否要切换成中文？
            </h2>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeChineseLanguagePrompt}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                暂不
              </button>
              <button
                type="button"
                onClick={switchToChinese}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                确定
              </button>
            </div>
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

        <HomeHero />
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

        <RegistrationFlow
          authState={authState}
          onAuthRequired={() => setAuthOpenSignal((value) => value + 1)}
        />
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

      <ContactModal
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
      />

    </div>
  );
}

export default App;
