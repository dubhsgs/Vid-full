import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const HERO_FIGURE_SRC = '/hero_figure.webp';
const HERO_FIGURE_MOBILE_SRC = '/hero_figure_mobile.webp';

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
          <stop offset="0%" stopColor="#f1fbff" stopOpacity="0.0824" />
          <stop offset="52%" stopColor="#d2e3ff" stopOpacity="0.0637" />
          <stop offset="100%" stopColor="#9db4e7" stopOpacity="0.045" />
        </linearGradient>
        <linearGradient id="hero-gshine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfeff" stopOpacity="0.045" />
          <stop offset="38%" stopColor="#e2f0ff" stopOpacity="0.0243" />
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
export function HomeHero() {
  const { t, i18n } = useTranslation();
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

  return (
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
  );
}
