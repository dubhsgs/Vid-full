import { X, Check, ShoppingCart, ExternalLink, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/licenseManager';
import { getClientId } from '../utils/fingerprint';

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
  onPurchaseComplete?: () => void;
}

const pricingTiers = [
  {
    name: '1次套餐',
    price: '¥0.01', // TEMP test price — change to ¥9.9 before go-live
    certificates: 1,
    popular: false,
    packSize: 1,
  },
  {
    name: '5次套餐',
    price: '¥39.9',
    certificates: 5,
    popular: true,
    packSize: 5,
  },
  {
    name: '10次套餐',
    price: '¥69.9',
    certificates: 10,
    popular: false,
    packSize: 10,
  },
];

export function PaywallModal({ isOpen, onClose, onPurchaseComplete }: PaywallModalProps) {
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
      const clientId = await getClientId();

      const { data, error } = await supabase.functions.invoke('alipay-create-order', {
        body: {
          client_id: clientId,
          pack_size: packSize,
          return_url: window.location.origin + '/payment-success',
        },
      });

      if (error) {
        console.error('Error creating order:', error);
        setPurchaseError('创建订单失败，请稍后重试');
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
            window.location.href = data.payment_url;
          }
        }
        setPurchasingPackSize(null);
      } else {
        setPurchaseError('获取支付链接失败');
        setPurchasingPackSize(null);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setPurchaseError('网络错误，请检查连接');
      setPurchasingPackSize(null);
    }
  };

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
          {inIframe && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-sm leading-relaxed">
                当前处于预览环境，支付宝无法在内嵌窗口中打开。点击"立即购买"后，支付页面将在新标签页中打开，请完成支付后回到此页面刷新。
              </p>
            </div>
          )}

          <h2 className="text-3xl font-bold text-white text-center mb-2">
            解锁更多证书生成次数
          </h2>
          <p className="text-slate-400 text-center mb-8">
            选择适合您的套餐，支付宝安全支付
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {pricingTiers.map((tier) => {
              const isThisPurchasing = purchasingPackSize === tier.packSize;
              const isAnyPurchasing = purchasingPackSize !== null;

              return (
                <div
                  key={tier.packSize}
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
                      disabled={isAnyPurchasing}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isThisPurchasing ? '处理中...' : '立即购买'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {pendingPaymentUrl && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-300 text-sm text-center mb-3">
                支付宝页面已在新标签页打开。如未打开，请点击下方按钮：
              </p>
              <a
                href={pendingPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                在新标签页打开支付宝
              </a>
            </div>
          )}

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
