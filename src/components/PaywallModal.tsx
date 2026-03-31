import { X, Check, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/licenseManager';
import { getClientId } from '../utils/fingerprint';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export function PaywallModal({ isOpen, onClose, onPurchaseComplete }: PaywallModalProps) {
  const { t } = useTranslation();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPurchaseError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (packSize: number) => {
    setIsPurchasing(true);
    setPurchaseError('');

    try {
      const clientId = await getClientId();

      const { data, error } = await supabase.functions.invoke('alipay-create-order', {
        body: {
          client_id: clientId,
          pack_size: packSize,
          return_url: window.location.origin + '/payment-success',
        }
      });

      if (error) {
        console.error('Error creating order:', error);
        setPurchaseError('创建订单失败，请稍后重试');
        setIsPurchasing(false);
        return;
      }

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        setPurchaseError('获取支付链接失败');
        setIsPurchasing(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setPurchaseError('网络错误，请检查连接');
      setIsPurchasing(false);
    }
  };

  const pricingTiers = [
    {
      name: t('paywall.pack10') || '10次套餐',
      price: '¥9.9',
      certificates: 10,
      popular: false,
      packSize: 10,
    },
    {
      name: t('paywall.pack50') || '50次套餐',
      price: '¥39.9',
      certificates: 50,
      popular: true,
      packSize: 50,
    },
    {
      name: t('paywall.pack100') || '100次套餐',
      price: '¥69.9',
      certificates: 100,
      popular: false,
      packSize: 100,
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
            {t('paywall.title') || '解锁更多证书生成次数'}
          </h2>
          <p className="text-slate-400 text-center mb-8">
            {t('paywall.subtitle') || '选择适合您的套餐，支付宝安全支付'}
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
                  <button
                    onClick={() => handlePurchase(tier.packSize)}
                    disabled={isPurchasing}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isPurchasing ? '处理中...' : '立即购买'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {purchaseError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-center">{purchaseError}</p>
            </div>
          )}

          <div className="border-t border-slate-700 pt-6 mt-6">
            <p className="text-slate-500 text-xs text-center">
              支付由支付宝提供安全保障 • 购买后次数将自动充值到您的账户
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
