import { createRoot } from 'react-dom/client';
import { lazy, StrictMode, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { initializeAnalytics } from './utils/analytics.ts';
import './index.css';

const CardGenerator = lazy(() => import('./components/CardGenerator.tsx').then((mod) => ({ default: mod.CardGenerator })));
const VerifyPage = lazy(() => import('./pages/VerifyPage.tsx').then((mod) => ({ default: mod.VerifyPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.tsx').then((mod) => ({ default: mod.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage.tsx').then((mod) => ({ default: mod.TermsPage })));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage.tsx').then((mod) => ({ default: mod.PaymentSuccessPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.tsx').then((mod) => ({ default: mod.NotFoundPage })));

initializeAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#03050a]" />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/card-generator" element={<CardGenerator />} />
          <Route path="/verify/:id" element={<VerifyPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
