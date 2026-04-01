import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';

export function MaintenanceMode() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-amber-500/10 rounded-full border-2 border-amber-500/30">
            <Construction className="w-16 h-16 text-amber-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          {t('maintenance.title')}
        </h1>

        <p className="text-xl text-slate-300 mb-4">
          {t('maintenance.message')}
        </p>

        <p className="text-slate-400">
          {t('maintenance.thank')}
        </p>

        <div className="mt-12 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-500">
            V-ID Platform - 面向开发者的数字资产存档与身份识别技术展示平台
          </p>
        </div>
      </div>
    </div>
  );
}
