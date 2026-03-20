import { useTranslation } from 'react-i18next';

interface ProgressStageProps {
  stage: 'reading' | 'hashing' | 'ready';
}

export function ProgressStage({ stage }: ProgressStageProps) {
  const { t } = useTranslation();

  const stages = [
    { key: 'reading', label: t('progress.reading') },
    { key: 'hashing', label: t('progress.hashing') },
    { key: 'ready', label: t('progress.ready') },
  ];

  return (
    <div className="space-y-4">
      {stages.map((s) => (
        <div key={s.key} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s.key === stage || stages.indexOf(s) < stages.indexOf(stages.find((x) => x.key === stage) || stages[0])
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {stages.indexOf(s) < stages.indexOf(stages.find((x) => x.key === stage) || stages[0])
              ? '✓'
              : stages.indexOf(s) + 1}
          </div>
          <span
            className={`text-sm transition-colors ${
              s.key === stage ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            {s.label}
          </span>
          {s.key === stage && (
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse ml-auto"></span>
          )}
        </div>
      ))}
    </div>
  );
}
