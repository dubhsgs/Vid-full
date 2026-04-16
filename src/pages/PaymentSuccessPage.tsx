import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import { getOrderStatus, getClientQuotaInfo } from '../utils/licenseManager';

type Status = 'checking' | 'success' | 'timeout';

const MAX_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 3000;

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [credits, setCredits] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outTradeNo = searchParams.get('out_trade_no');

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const checkOrder = useCallback(async (): Promise<boolean> => {
    if (!outTradeNo) return false;
    try {
      const orderStatus = await getOrderStatus(outTradeNo);
      if (orderStatus === 'paid') {
        const info = await getClientQuotaInfo();
        setCredits(info.remaining_credits);
        setStatus('success');
        return true;
      }
    } catch {
      // continue polling
    }
    return false;
  }, [outTradeNo]);

  const startPolling = useCallback(() => {
    let attempt = 0;
    setAttempts(0);
    setStatus('checking');

    const poll = async () => {
      const found = await checkOrder();
      attempt++;
      setAttempts(attempt);

      if (!found) {
        if (attempt < MAX_ATTEMPTS) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setStatus('timeout');
        }
      }
    };

    poll();
  }, [checkOrder]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleRetry = () => {
    stopPolling();
    startPolling();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === 'checking' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <RefreshCw className="w-9 h-9 text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">正在确认支付</h1>
            <p className="text-slate-400 mb-2">正在等待支付宝回调确认...</p>
            <p className="text-slate-600 text-sm">已检查 {attempts} / {MAX_ATTEMPTS} 次</p>
            {outTradeNo && (
              <p className="text-slate-700 text-xs mt-2 break-all">订单号：{outTradeNo}</p>
            )}
            <div className="mt-6 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">支付成功</h1>
            <p className="text-slate-400 mb-2">次数已到账，感谢您的购买！</p>
            {credits !== null && (
              <div className="mt-4 mb-6 inline-block px-5 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                <span className="text-green-400 font-semibold text-lg">当前剩余：{credits} 次</span>
              </div>
            )}
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 mx-auto mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </button>
          </div>
        )}

        {status === 'timeout' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-9 h-9 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">支付处理中</h1>
            <p className="text-slate-400 mb-2 leading-relaxed">
              支付宝通知可能存在延迟，次数稍后会自动到账，无需重复操作。
            </p>
            {outTradeNo && (
              <p className="text-slate-500 text-sm mt-2 break-all">订单号：{outTradeNo}</p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新检查
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回主页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
