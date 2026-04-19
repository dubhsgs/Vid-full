import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Copy, Download, RefreshCw } from 'lucide-react';
import { getOrderStatus, saveActivationCode, type OrderStatusInfo } from '../utils/licenseManager';

type PaymentPageStatus = 'checking' | 'success' | 'pending';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 10;

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outTradeNo = searchParams.get('out_trade_no');

  const [pageStatus, setPageStatus] = useState<PaymentPageStatus>('checking');
  const [attempts, setAttempts] = useState(0);
  const [orderInfo, setOrderInfo] = useState<OrderStatusInfo | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [copyLabel, setCopyLabel] = useState('复制激活码');

  const activationCode = orderInfo?.license_key || null;

  const statusLabel = useMemo(() => {
    if (!outTradeNo) {
      return '未检测到订单号，请返回首页重新发起购买。';
    }

    if (pageStatus === 'success') {
      return '支付成功，系统已生成激活码。请复制或下载保存，稍后可凭激活码继续生成证书。';
    }

    if (orderInfo?.status === 'paid') {
      return '支付已完成，正在为您生成激活码，请稍候。';
    }

    return '正在等待支付宝回调确认到账，请稍候。';
  }, [orderInfo?.status, outTradeNo, pageStatus]);

  const checkPaymentStatus = useCallback(async (): Promise<boolean> => {
    if (!outTradeNo) {
      setPageStatus('pending');
      return false;
    }

    const order = await getOrderStatus(outTradeNo);
    setOrderInfo(order);

    if (!order) {
      return false;
    }

    if (order.status === 'paid' && order.license_key) {
      saveActivationCode(order.license_key);
      setPageStatus('success');
      return true;
    }

    return false;
  }, [outTradeNo]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let localAttempts = 0;

    const poll = async () => {
      const isReady = await checkPaymentStatus();
      if (cancelled) {
        return;
      }

      localAttempts += 1;
      setAttempts(localAttempts);

      if (isReady) {
        return;
      }

      if (localAttempts >= MAX_ATTEMPTS) {
        setPageStatus('pending');
        return;
      }

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };

    setPageStatus('checking');
    setAttempts(0);
    poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkPaymentStatus, reloadToken]);

  const handleCopyActivationCode = useCallback(async () => {
    if (!activationCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activationCode);
      setCopyLabel('已复制');
      window.setTimeout(() => setCopyLabel('复制激活码'), 1600);
    } catch (error) {
      console.error('Failed to copy activation code:', error);
      setCopyLabel('复制失败');
      window.setTimeout(() => setCopyLabel('复制激活码'), 1600);
    }
  }, [activationCode]);

  const handleDownloadActivationCode = useCallback(() => {
    if (!activationCode || !orderInfo) {
      return;
    }

    const textContent = [
      'V-ID 激活码凭证',
      '',
      `订单号：${orderInfo.out_trade_no}`,
      `套餐次数：${orderInfo.pack_size} 次`,
      `支付金额：¥${Number(orderInfo.amount).toFixed(2)}`,
      '',
      `激活码：${activationCode}`,
      '',
      '使用说明：',
      '1. 返回 V-ID 首页。',
      '2. 在生成证书区域输入此激活码。',
      '3. 每生成一次证书，将从该激活码中扣减 1 次。',
      '',
      '请妥善保存本文件。如更换浏览器、设备或清理缓存，可重新输入激活码继续使用。',
    ].join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `V-ID_激活码_${orderInfo.out_trade_no}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activationCode, orderInfo]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-blue-500/20 bg-slate-950/90 p-8 shadow-2xl">
        <div className="text-center">
          {pageStatus === 'success' ? (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              {pageStatus === 'checking' ? (
                <RefreshCw className="w-9 h-9 text-amber-400 animate-spin" />
              ) : (
                <Clock className="w-9 h-9 text-amber-400" />
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-3">
            {pageStatus === 'success' ? '购买成功' : '支付确认中'}
          </h1>
          <p className="text-slate-400 leading-relaxed">{statusLabel}</p>

          {outTradeNo && (
            <p className="mt-4 text-xs text-slate-500 break-all">
              订单号：{outTradeNo}
            </p>
          )}

          {orderInfo && (
            <div className="mt-4 text-sm text-slate-300 space-y-1">
              <p>套餐次数：{orderInfo.pack_size} 次</p>
              <p>订单状态：{orderInfo.status === 'paid' ? '已支付' : '待支付'}</p>
            </div>
          )}

          {pageStatus === 'checking' && (
            <>
              <p className="mt-4 text-xs text-slate-500">已检查 {attempts} / {MAX_ATTEMPTS} 次</p>
              <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                />
              </div>
            </>
          )}

          {pageStatus === 'success' && activationCode && (
            <div className="mt-6 text-left p-4 rounded-xl border border-green-500/30 bg-green-500/10">
              <p className="text-xs uppercase tracking-[0.2em] text-green-300 mb-2">Activation Code</p>
              <p className="text-xl md:text-2xl font-bold text-white break-all">{activationCode}</p>
              <p className="mt-3 text-sm text-green-200 leading-relaxed">
                激活码也已暂存到当前浏览器。清缓存前，请先复制或下载备份。
              </p>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <button
                  onClick={handleCopyActivationCode}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copyLabel}
                </button>
                <button
                  onClick={handleDownloadActivationCode}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载激活码 TXT
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {pageStatus !== 'success' && (
              <button
                onClick={() => setReloadToken((value) => value + 1)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新检查
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
