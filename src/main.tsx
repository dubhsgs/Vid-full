import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { CardGenerator } from './components/CardGenerator.tsx';
import { VerifyPage } from './pages/VerifyPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/card-generator" element={<CardGenerator />} />
        <Route path="/verify/:id" element={<VerifyPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
