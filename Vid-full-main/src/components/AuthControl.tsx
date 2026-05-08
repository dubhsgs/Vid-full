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

export function AuthControl({ openSignal = 0, onAuthChange }: AuthControlProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
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
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUser(data.user ?? null);
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
  }, []);

  useEffect(() => {
    if (openSignal > 0) {
      setIsOpen(true);
    }
  }, [openSignal]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage(t('auth.magicLinkSent'));
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
                  {isSubmitting ? t('auth.sending') : t('auth.sendMagicLink')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
