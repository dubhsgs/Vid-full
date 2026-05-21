const UMAMI_SCRIPT_ID = 'vaid-umami-analytics';

export function initializeAnalytics(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const scriptUrl = import.meta.env.VITE_UMAMI_SRC?.trim();
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim();

  if (!scriptUrl || !websiteId || document.getElementById(UMAMI_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = scriptUrl;
  script.dataset.websiteId = websiteId;
  script.dataset.excludeSearch = 'true';
  script.dataset.excludeHash = 'true';
  script.dataset.doNotTrack = 'true';

  const allowedDomains = import.meta.env.VITE_UMAMI_DOMAINS?.trim();
  if (allowedDomains) {
    script.dataset.domains = allowedDomains;
  }

  document.head.appendChild(script);
}
