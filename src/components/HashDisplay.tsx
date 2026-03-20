import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface HashDisplayProps {
  hash: string;
  characterName: string;
  creatorName: string;
}

export function HashDisplay({
  hash,
  characterName,
  creatorName,
}: HashDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verificationUrl = `https://opentimestamps.org/?hash=${hash}`;

  return (
    <div className="space-y-6 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-xl p-6 border border-blue-500/30">
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
          {t('hash.title')}
        </h4>
        <div className="bg-black/50 rounded-lg p-4 border border-blue-500/20 group">
          <code className="text-xs text-green-400 font-mono break-all">{hash}</code>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {t('hash.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('hash.copy')}
              </>
            )}
          </button>
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {t('hash.verify')}
          </a>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {t('hash.characterName')}
          </p>
          <p className="text-lg text-white">{characterName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {t('hash.creator')}
          </p>
          <p className="text-lg text-white">{creatorName}</p>
        </div>
      </div>
    </div>
  );
}
