import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#030713] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10">
          <AlertCircle className="h-8 w-8 text-cyan-200" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {t('notFound.title')}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {t('notFound.message')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backHome')}
        </button>
      </div>
    </div>
  );
}
