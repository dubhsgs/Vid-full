import { X, Check, Loader2, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (key: string) => Promise<boolean>;
}

type PaymentMethod = 'alipay' | 'wechat';
type ViewMode = 'pricing' | 'payment' | 'activation';

interface PaymentOrder {
  order_no: string;
  qr_code_url: string;
  amount: number;
  payment_method: string;
  expires_at: string;
}

interface PaymentStatus {
  order_no: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  license_key?: string;
  certificate_count?: number;
}

export function PaywallModal({ isOpen, onClose, onActivate }: PaywallModalProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('pricing');
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setViewMode('pricing');
      setPaymentOrder(null);
      setPaymentStatus(null);
      setLicenseKey('');
      setActivationError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!paymentOrder) return;

    const expiresAt = new Date(paymentOrder.expires_at).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        setPaymentStatus({ ...paymentStatus!, status: 'expired' });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [paymentOrder]);

  useEffect(() => {
    if (!paymentOrder || paymentStatus?.status === 'paid') return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status?order_no=${paymentOrder.order_no}`
        );
        const data: PaymentStatus = await response.json();
        setPaymentStatus(data);

        if (data.status === 'paid' && data.license_key) {
          await onActivate(data.license_key);
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [paymentOrder, paymentStatus, onActivate, onClose]);

  if (!isOpen) return null;

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

  const createPaymentOrder = async (amount: number, method: PaymentMethod) => {
    setIsCreatingOrder(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            payment_method: method,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const order: PaymentOrder = await response.json();
      setPaymentOrder(order);
      setPaymentStatus({ order_no: order.order_no, status: 'pending' });
      setViewMode('payment');
    } catch (error) {
      console.error('Error creating payment order:', error);
      alert('创建订单失败，请重试');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pricingTiers = [
    {
      name: t('paywall.single'),
      price: 9.9,
      displayPrice: '¥9.9',
      certificates: 1,
      popular: false,
    },
    {
      name: t('paywall.pack5'),
      price: 39,
      displayPrice: '¥39',
      certificates: 5,
      popular: true,
    },
    {
      name: t('paywall.pack10'),
      price: 69,
      displayPrice: '¥69',
      certificates: 10,
      popular: false,
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
          {viewMode === 'pricing' && (
            <>
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
                      <div className="text-3xl font-bold text-blue-400 mb-4">{tier.displayPrice}</div>
                      <div className="flex items-center justify-center gap-2 text-slate-300 mb-6">
                        <Check className="w-5 h-5 text-green-400" />
                        <span>{tier.certificates} 次证书生成</span>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => createPaymentOrder(tier.price, 'alipay')}
                          disabled={isCreatingOrder}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {isCreatingOrder ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              支付宝支付
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => createPaymentOrder(tier.price, 'wechat')}
                          disabled={isCreatingOrder}
                          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {isCreatingOrder ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              微信支付
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-8">
                <button
                  onClick={() => setViewMode('activation')}
                  className="mx-auto block text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  已有激活码？点击输入
                </button>
              </div>
            </>
          )}

          {viewMode === 'payment' && paymentOrder && (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                扫码支付
              </h2>

              {paymentStatus?.status === 'paid' ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">支付成功！</p>
                  <p className="text-slate-300">激活码已自动应用</p>
                  <p className="text-sm text-slate-400">窗口将在3秒后关闭...</p>
                </div>
              ) : paymentStatus?.status === 'expired' ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-red-400">二维码已过期</p>
                  <button
                    onClick={() => setViewMode('pricing')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    重新生成
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-6 rounded-xl mb-6">
                    <img
                      src={paymentOrder.qr_code_url}
                      alt="Payment QR Code"
                      className="w-full h-auto"
                    />
                  </div>

                  <div className="text-center space-y-3 mb-6">
                    <p className="text-lg text-white font-semibold">
                      支付金额: <span className="text-blue-400">¥{paymentOrder.amount}</span>
                    </p>
                    <p className="text-slate-400">
                      订单号: {paymentOrder.order_no}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <p className="text-slate-300">
                        等待支付... {formatCountdown(countdown)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setViewMode('pricing')}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      返回
                    </button>
                    <button
                      onClick={() => setViewMode('activation')}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      已有激活码
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {viewMode === 'activation' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                输入激活码
              </h2>

              <div className="space-y-4">
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

                <button
                  onClick={() => setViewMode('pricing')}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  返回购买
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
