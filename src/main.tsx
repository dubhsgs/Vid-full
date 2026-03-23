import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { CardGenerator } from './components/CardGenerator.tsx';
import { VerifyPage } from './pages/VerifyPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/card-generator" element={<CardGenerator />} />
        <Route path="/verify/:id" element={<VerifyPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
