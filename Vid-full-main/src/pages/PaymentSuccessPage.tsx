import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { AuthControl, type AuthSessionState } from '../components/AuthControl';
import { supabase, type OrderStatusInfo } from '../utils/licenseManager';

type PaymentPageStatus = 'checking' | 'success' | 'pending' | 'auth_required' | 'error';
type CheckResult = 'paid' | 'pending' | 'auth_required' | 'error';

const AUTO_RETRY_DELAYS_MS = [0, 1800, 4200];
const AUTO_REDIRECT_MS_WITHOUT_CODE = 5000;

interface QueryOrderResponse {
  success?: boolean;
  paid?: boolean;
  order?: OrderStatusInfo | null;
  added_credits?: number;
  paid_credits?: number;
  error?: string;
}

function isAuthError(error: unknown): boolean {
  const typedError = error as { context?: { status?: number }; message?: string } | null;
  return typedError?.context?.status === 401 || /AUTH_REQUIRED|401|Unauthorized/i.test(typedError?.message || '');
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const outTradeNo = searchParams.get('out_trade_no');
  const [pageStatus, setPageStatus] = useState<PaymentPageStatus>('checking');
  const [orderInfo, setOrderInfo] = useState<OrderStatusInfo | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [paidCredits, setPaidCredits] = useState<number | null>(null);
  const [authOpenSignal, setAuthOpenSignal] = useState(0);
  const [authState, setAuthState] = useState<AuthSessionState>({
    user: null,
    emailConfirmed: false,
    loading: true,
  });
  const hasAutoRedirectedRef = useRef(false);

  const statusLabel = useMemo(() => {
    if (!outTradeNo) {
      return '未检测到订单号，请返回首页重新发起购买。';
    }

    if (pageStatus === 'success') {
      return '支付成功，额度已充入您的 VAID 账户，正在为你返回主页。';
    }

    if (pageStatus === 'auth_required') {
      return '支付页面没有带回登录状态。请在当前页面用同一个邮箱登录，再点重新确认。';
    }

    if (pageStatus === 'error') {
      return '支付确认请求失败。请点重新确认，款项不会丢失。';
    }

    if (pageStatus === 'pending') {
      return '支付宝可能还在同步结果。请稍等几秒后点重新确认，不要重复购买。';
    }

    if (orderInfo?.status === 'paid') {
      return '支付已完成，正在同步账户额度，请稍候。';
    }

    return '正在确认支付结果，请稍候。';
  }, [orderInfo?.status, outTradeNo, pageStatus]);

  const checkPaymentStatus = useCallback(async (): Promise<CheckResult> => {
    if (!outTradeNo) {
      setPageStatus('pending');
      return 'pending';
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setPageStatus('auth_required');
      return 'auth_required';
    }

    const { data, error } = await supabase.functions.invoke('alipay-query-order', {
      body: { out_trade_no: outTradeNo },
    });

    if (error) {
      console.error('alipay-query-order failed:', error);
      setPageStatus(isAuthError(error) ? 'auth_required' : 'error');
      return isAuthError(error) ? 'auth_required' : 'error';
    }

    const payload = (data ?? null) as QueryOrderResponse | null;
    if (payload?.error === 'AUTH_REQUIRED') {
      setPageStatus('auth_required');
      return 'auth_required';
    }

    const syncedOrder = payload?.order ?? null;
    if (syncedOrder) {
      setOrderInfo(syncedOrder);
    }

    if (syncedOrder?.status === 'paid') {
      if (typeof payload?.paid_credits === 'number') {
        setPaidCredits(payload.paid_credits);
      }
      setPageStatus('success');
      return 'paid';
    }

    return 'pending';
  }, [outTradeNo]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    const runAttempt = (index: number) => {
      const timer = window.setTimeout(async () => {
        if (cancelled) return;
        setPageStatus('checking');
        const result = await checkPaymentStatus();
        if (cancelled || result !== 'pending') return;

        if (index + 1 < AUTO_RETRY_DELAYS_MS.length) {
          runAttempt(index + 1);
        } else {
          setPageStatus('pending');
        }
      }, AUTO_RETRY_DELAYS_MS[index]);

      timers.push(timer);
    };

    runAttempt(0);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [checkPaymentStatus, reloadToken]);

  useEffect(() => {
    if (pageStatus !== 'auth_required' || !authState.user || !authState.emailConfirmed) {
      return;
    }

    setReloadToken((value) => value + 1);
  }, [authState.emailConfirmed, authState.user, pageStatus]);

  const handleGoHome = useCallback(() => {
    const targetUrl = `${window.location.origin}/`;
    try {
      window.location.replace(targetUrl);
    } catch {
      try {
        window.top!.location.href = targetUrl;
      } catch {
        window.location.assign(targetUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (pageStatus !== 'success' || hasAutoRedirectedRef.current) {
      return;
    }

    hasAutoRedirectedRef.current = true;
    const timer = window.setTimeout(() => {
      handleGoHome();
    }, AUTO_REDIRECT_MS_WITHOUT_CODE);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleGoHome, pageStatus]);

  const isSuccessful = pageStatus === 'success';
  const needsAuth = pageStatus === 'auth_required';
  const isChecking = pageStatus === 'checking';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-10">
        <AuthControl openSignal={authOpenSignal} onAuthChange={setAuthState} />
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-blue-500/20 bg-slate-950/90 p-8 shadow-2xl">
        <div className="text-center">
          {isSuccessful ? (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          ) : needsAuth ? (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-9 h-9 text-amber-400" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              {isChecking ? (
                <RefreshCw className="w-9 h-9 text-amber-400 animate-spin" />
              ) : (
                <Clock className="w-9 h-9 text-amber-400" />
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-3">
            {isSuccessful ? '购买成功' : needsAuth ? '需要重新登录' : '支付确认中'}
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
              {paidCredits !== null && <p>当前付费额度：{paidCredits} 次</p>}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {needsAuth && (
              <button
                onClick={() => setAuthOpenSignal((value) => value + 1)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                登录后确认到账
              </button>
            )}

            {!isSuccessful && !isChecking && (
              <button
                onClick={() => setReloadToken((value) => value + 1)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新确认
              </button>
            )}

            <button
              onClick={handleGoHome}
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
