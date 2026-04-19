import { useState } from 'react';
import { CardGenerator } from './components/CardGenerator';
import { MaintenanceMode } from './components/MaintenanceMode';
import App from './App';

export function AppWithRouter() {
  const [currentPage, setCurrentPage] = useState<'certificate' | 'card'>('certificate');

  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    return <MaintenanceMode />;
  }

  return (
    <div className="min-h-screen bg-[#171717]">
      <nav className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setCurrentPage('certificate')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            currentPage === 'certificate'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
          }`}
        >
          V-ID Certificate
        </button>
        <button
          onClick={() => setCurrentPage('card')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            currentPage === 'card'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
          }`}
        >
          Card Generator
        </button>
      </nav>

      {currentPage === 'certificate' ? <App /> : <CardGenerator />}
    </div>
  );
}
