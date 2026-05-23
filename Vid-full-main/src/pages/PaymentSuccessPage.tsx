import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      return t('paymentSuccess.missingOrder');
    }

    if (pageStatus === 'success') {
      return t('paymentSuccess.successStatus');
    }

    if (pageStatus === 'auth_required') {
      return t('paymentSuccess.authRequiredStatus');
    }

    if (pageStatus === 'error') {
      return t('paymentSuccess.errorStatus');
    }

    if (pageStatus === 'pending') {
      return t('paymentSuccess.pendingStatus');
    }

    if (orderInfo?.status === 'paid') {
      return t('paymentSuccess.syncingStatus');
    }

    return t('paymentSuccess.checkingStatus');
  }, [orderInfo?.status, outTradeNo, pageStatus, t]);

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
  const orderStatusLabel = orderInfo?.status === 'paid'
    ? t('paymentSuccess.statusPaid')
    : t('paymentSuccess.statusPending');

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
            {isSuccessful
              ? t('paymentSuccess.successTitle')
              : needsAuth
                ? t('paymentSuccess.authRequiredTitle')
                : t('paymentSuccess.checkingTitle')}
          </h1>
          <p className="text-slate-400 leading-relaxed">{statusLabel}</p>

          {outTradeNo && (
            <p className="mt-4 text-xs text-slate-500 break-all">
              {t('paymentSuccess.orderNumber', { orderNumber: outTradeNo })}
            </p>
          )}

          {orderInfo && (
            <div className="mt-4 text-sm text-slate-300 space-y-1">
              <p>{t('paymentSuccess.packSize', { count: orderInfo.pack_size })}</p>
              <p>{t('paymentSuccess.orderStatus', { status: orderStatusLabel })}</p>
              {paidCredits !== null && <p>{t('paymentSuccess.paidCredits', { count: paidCredits })}</p>}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {needsAuth && (
              <button
                onClick={() => setAuthOpenSignal((value) => value + 1)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                {t('paymentSuccess.confirmAfterLogin')}
              </button>
            )}

            {!isSuccessful && !isChecking && (
              <button
                onClick={() => setReloadToken((value) => value + 1)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('paymentSuccess.retry')}
              </button>
            )}

            <button
              onClick={handleGoHome}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('paymentSuccess.backHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
