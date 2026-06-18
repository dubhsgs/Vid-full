import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleClose = useCallback(() => {
    setStatus('idle');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');

    const { error } = await supabase.functions.invoke('contact-submit', {
      body: {
        name,
        email,
        message,
        page_url: window.location.href,
        language: i18n.resolvedLanguage ?? i18n.language,
      },
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('sent');
    setName('');
    setEmail('');
    setMessage('');
  }, [email, i18n.language, i18n.resolvedLanguage, message, name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/72 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-5 shadow-2xl shadow-cyan-950/40 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{t('footer.contactTitle')}</h2>
            <p className="mt-2 text-sm text-slate-400">{t('footer.contactSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-cyan-400/50 hover:text-cyan-100"
          >
            {t('auth.close')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('footer.contactName')}
            className="w-full rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <input
            type="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('footer.contactEmail')}
            className="w-full rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <textarea
            required
            maxLength={4000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('footer.contactMessage')}
            className="w-full resize-none rounded-lg border border-slate-700 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          {status === 'sent' && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {t('footer.contactSent')}
            </p>
          )}
          {status === 'error' && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {t('footer.contactError')}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {status === 'sending' ? t('footer.contactSending') : t('footer.contactSend')}
          </button>
        </form>
      </div>
    </div>
  );
}
