import { X, Check, ShoppingCart, ExternalLink, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/licenseManager';

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pricingTiers = [
  {
    nameKey: 'paywall.pack1',
    price: '¥0.01',
    certificates: 1,
    popular: false,
    packSize: 1,
  },
  {
    nameKey: 'paywall.pack5',
    price: '¥39.9',
    certificates: 5,
    popular: true,
    packSize: 5,
  },
  {
    nameKey: 'paywall.pack10',
    price: '¥69.9',
    certificates: 10,
    popular: false,
    packSize: 10,
  },
];

function getPaymentReturnUrl(): string {
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/payment-success`;
  }

  return 'https://vaid.top/payment-success';
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const { t } = useTranslation();
  const [purchasingPackSize, setPurchasingPackSize] = useState<number | null>(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);
  const inIframe = isInIframe();

  useEffect(() => {
    if (isOpen) {
      setPurchaseError('');
      setPurchasingPackSize(null);
      setPendingPaymentUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (packSize: number) => {
    if (purchasingPackSize !== null) return;
    setPurchasingPackSize(packSize);
    setPurchaseError('');

    try {
      const returnUrl = getPaymentReturnUrl();

      const { data, error } = await supabase.functions.invoke('alipay-create-order', {
        body: {
          pack_size: packSize,
          return_url: returnUrl,
        },
      });

      if (error) {
        console.error('Error creating order:', error);
        setPurchaseError(t('paywall.createOrderFailed'));
        setPurchasingPackSize(null);
        return;
      }

      if (data?.payment_url) {
        if (inIframe) {
          setPendingPaymentUrl(data.payment_url);
          window.open(data.payment_url, '_blank', 'noopener,noreferrer');
        } else {
          try {
            window.top!.location.href = data.payment_url;
          } catch {
            window.location.assign(data.payment_url);
          }
        }
      } else {
        setPurchaseError(t('paywall.paymentUrlFailed'));
      }
      setPurchasingPackSize(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setPurchaseError(t('paywall.networkError'));
      setPurchasingPackSize(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative my-auto w-full max-w-4xl max-h-[calc(100svh-1.5rem)] overflow-hidden rounded-xl border border-blue-500/30 bg-[#0a0a0a] shadow-2xl sm:max-h-[min(90vh,52rem)] sm:rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5" />

        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 text-slate-400 transition-colors hover:text-white sm:right-4 sm:top-4"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="relative max-h-[calc(100svh-1.5rem)] overflow-y-auto overscroll-contain p-4 sm:max-h-[min(90vh,52rem)] sm:p-8">
          {inIframe && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:mb-6 sm:rounded-xl sm:p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
              <p className="text-sm leading-relaxed text-amber-300">
                {t('paywall.iframeNotice')}
              </p>
            </div>
          )}

          <h2 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
            {t('paywall.title')}
          </h2>
          <p className="mx-auto mb-5 max-w-[18rem] text-center text-sm text-slate-400 sm:mb-8 sm:max-w-none sm:text-base">
            {t('paywall.subtitle')}
          </p>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 md:grid-cols-3">
            {pricingTiers.map((tier) => {
              const isThisPurchasing = purchasingPackSize === tier.packSize;
              const isAnyPurchasing = purchasingPackSize !== null;

              return (
                <div
                  key={tier.packSize}
                  className={`relative rounded-lg border p-4 transition-all sm:rounded-xl sm:p-6 ${
                    tier.popular
                      ? 'border-blue-500 bg-blue-500/5 md:scale-105'
                      : 'border-slate-700 bg-slate-900/50 hover:border-blue-500/50'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[11px] font-bold text-white sm:-top-3 sm:text-xs">
                      {t('paywall.bestValue')}
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="mb-2 text-lg font-bold text-white sm:text-xl">{t(tier.nameKey)}</h3>
                    <div className="mb-3 text-[2.25rem] font-bold leading-none text-blue-400 sm:mb-4 sm:text-3xl">{tier.price}</div>
                    <div className="mb-5 flex items-center justify-center gap-2 text-sm text-slate-300 sm:mb-6 sm:text-base">
                      <Check className="h-5 w-5 text-green-400" />
                      <span>{t('paywall.certificates', { count: tier.certificates })}</span>
                    </div>
                    <button
                      onClick={() => handlePurchase(tier.packSize)}
                      disabled={isAnyPurchasing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {isThisPurchasing ? t('form.processing') : t('paywall.buyNow')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {pendingPaymentUrl && (
            <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 sm:rounded-xl sm:p-4">
              <p className="mb-3 text-center text-sm text-blue-300">
                {t('paywall.pendingPayment')}
              </p>
              <a
                href={pendingPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                {t('paywall.openAlipay')}
              </a>
            </div>
          )}

          {purchaseError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-400 text-center">{purchaseError}</p>
            </div>
          )}

          <div className="mt-4 border-t border-slate-700 pt-4 sm:mt-6 sm:pt-6">
            <p className="text-center text-xs text-slate-500">
              {t('paywall.securityNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
