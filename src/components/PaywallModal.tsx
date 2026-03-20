import { X, Check, ExternalLink, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (key: string) => Promise<boolean>;
}

export function PaywallModal({ isOpen, onClose, onActivate }: PaywallModalProps) {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  if (!isOpen) return null;

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/afdian-webhook`;

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;

    setIsActivating(true);
    setActivationError('');
    const success = await onActivate(licenseKey);
    setIsActivating(false);

    if (success) {
      setLicenseKey('');
      onClose();
    } else {
      setActivationError('激活失败，请检查激活码是否正确');
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const pricingTiers = [
    {
      name: t('paywall.single'),
      price: '¥9.9',
      certificates: 1,
      popular: false,
      afdianUrl: 'https://afdian.com/item/105ab0e81ee511f188375254001e7c00'
    },
    {
      name: t('paywall.pack5'),
      price: '¥39',
      certificates: 5,
      popular: true,
      afdianUrl: 'https://afdian.com/item/4d67bc421ee511f1b6b152540025c377'
    },
    {
      name: t('paywall.pack10'),
      price: '¥69',
      certificates: 10,
      popular: false,
      afdianUrl: 'https://afdian.com/item/66bf30e41ee511f18a525254001e7c00'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative p-8">
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            {t('paywall.title')}
          </h2>
          <p className="text-slate-400 text-center mb-8">
            {t('paywall.subtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`relative p-6 rounded-xl border transition-all ${
                  tier.popular
                    ? 'border-blue-500 bg-blue-500/5 scale-105'
                    : 'border-slate-700 bg-slate-900/50 hover:border-blue-500/50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    最划算
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-4">{tier.price}</div>
                  <div className="flex items-center justify-center gap-2 text-slate-300 mb-6">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>{tier.certificates} 次证书生成</span>
                  </div>
                  <a
                    href={tier.afdianUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                  >
                    前往购买
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-8">
            <p className="text-slate-400 text-center mb-4">{t('paywall.enterKey')}</p>
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKey(e.target.value);
                    setActivationError('');
                  }}
                  placeholder={t('paywall.keyPlaceholder')}
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                />
                <button
                  onClick={handleActivate}
                  disabled={!licenseKey.trim() || isActivating}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {isActivating ? t('paywall.activating') : t('paywall.activate')}
                </button>
              </div>
              {activationError && (
                <p className="text-red-400 text-sm text-center">{activationError}</p>
              )}
            </div>

            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-xs mb-2 text-center">Webhook URL (供爱发电配置使用)</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-300 text-xs font-mono"
                />
                <button
                  onClick={copyWebhookUrl}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-1 text-xs"
                >
                  {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedWebhook ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
