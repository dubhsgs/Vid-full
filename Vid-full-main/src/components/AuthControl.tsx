import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogOut, Mail, UserCircle, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';

export interface AuthSessionState {
  user: User | null;
  emailConfirmed: boolean;
  loading: boolean;
}

interface AuthControlProps {
  openSignal?: number;
  onAuthChange?: (state: AuthSessionState) => void;
}

function getEmailConfirmed(user: User | null): boolean {
  if (!user) return false;
  const authUser = user as User & {
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  };
  return Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
}

function getShortEmail(email?: string): string {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 6)}@${domain.split('.')[0]}`;
}

function getEmailRedirectTo(): string {
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://vaid.top';
  }
  return origin;
}

function clearAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('error');
  url.searchParams.delete('error_code');
  url.searchParams.delete('error_description');
  url.hash = '';
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

async function completeAuthFromUrl(): Promise<string | null> {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = searchParams.get('code');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const authError = searchParams.get('error_description') || hashParams.get('error_description');

  if (authError) {
    clearAuthParamsFromUrl();
    return authError;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    clearAuthParamsFromUrl();
    return error?.message ?? null;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    window.history.replaceState({}, document.title, window.location.pathname || '/');
    return error?.message ?? null;
  }

  return null;
}

export function AuthControl({ openSignal = 0, onAuthChange }: AuthControlProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const emailConfirmed = getEmailConfirmed(user);
  const state = useMemo<AuthSessionState>(() => ({
    user,
    emailConfirmed,
    loading,
  }), [emailConfirmed, loading, user]);

  useEffect(() => {
    onAuthChange?.(state);
  }, [onAuthChange, state]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const callbackError = await completeAuthFromUrl();
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      if (callbackError && !data.session?.user) {
        setError(t('auth.magicLinkInvalid'));
        setIsOpen(true);
      }
      setLoading(false);
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    if (openSignal > 0) {
      setIsOpen(true);
    }
  }, [openSignal]);

  const handleSendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(t('auth.emailRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setEmail(normalizedEmail);
    setOtpEmail(normalizedEmail);
    setOtpCode('');
    setMessage(t('auth.otpSent', { email: normalizedEmail }));
  };

  const handleVerifyCode = async () => {
    const normalizedCode = otpCode.trim().replace(/\s+/g, '');
    if (!otpEmail) {
      setError(t('auth.emailRequired'));
      return;
    }

    if (!normalizedCode) {
      setError(t('auth.otpRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: normalizedCode,
      type: 'email',
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError(t('auth.otpInvalid'));
      return;
    }

    setUser(data.user ?? data.session?.user ?? null);
    setOtpCode('');
    setOtpEmail('');
    setMessage('');
    setIsOpen(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (otpEmail) {
      await handleVerifyCode();
      return;
    }

    await handleSendCode();
  };

  const handleChangeEmail = () => {
    setOtpEmail('');
    setOtpCode('');
    setMessage('');
    setError('');
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    setError('');
    await supabase.auth.signOut();
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors"
      >
        <UserCircle className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-slate-300">
          {loading ? t('auth.loading') : user ? getShortEmail(user.email) || t('auth.account') : t('auth.login')}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-blue-500/30 bg-slate-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-white"
              aria-label={t('auth.close')}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">VAID Account</p>
              <h2 className="text-2xl font-bold text-white">{user ? t('auth.account') : t('auth.loginTitle')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {user ? t('auth.accountSubtitle') : t('auth.loginSubtitle')}
              </p>
            </div>

            {user ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-500">{t('auth.currentEmail')}</p>
                  <p className="mt-1 break-all text-white">{user.email}</p>
                  <p className={`mt-3 text-sm ${emailConfirmed ? 'text-green-400' : 'text-amber-300'}`}>
                    {emailConfirmed ? t('auth.emailVerified') : t('auth.emailNotVerified')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {t('auth.signOut')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!otpEmail ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">{t('auth.email')}</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError('');
                          setMessage('');
                        }}
                        placeholder={t('auth.emailPlaceholder')}
                        className="w-full rounded-lg border border-slate-700 bg-[#0a0a0a] py-3 pl-10 pr-4 text-white placeholder:text-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                      <p className="text-sm text-slate-500">{t('auth.codeSentTo')}</p>
                      <p className="mt-1 break-all text-white">{otpEmail}</p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">{t('auth.otpCode')}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpCode}
                        onChange={(event) => {
                          setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                          setError('');
                        }}
                        placeholder={t('auth.otpPlaceholder')}
                        className="w-full rounded-lg border border-slate-700 bg-[#0a0a0a] px-4 py-3 text-center text-xl font-semibold tracking-[0.36em] text-white placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? (otpEmail ? t('auth.verifyingCode') : t('auth.sending'))
                    : (otpEmail ? t('auth.verifyCode') : t('auth.sendCode'))}
                </button>

                {otpEmail && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSubmitting}
                      className="rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('auth.resendCode')}
                    </button>
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      disabled={isSubmitting}
                      className="rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('auth.changeEmail')}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
