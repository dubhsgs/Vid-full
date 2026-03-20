import { useState } from 'react';
import { Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/licenseManager';

interface LicenseInfo {
  license_key: string;
  pack_size: number;
  used_count: number;
  created_at: string;
  expires_at: string | null;
}

interface Props {
  onActivated: (licenseInfo: LicenseInfo) => void;
}

export function LicenseActivation({ onActivated }: Props) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('请输入激活码');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('license_keys')
        .select('license_key, pack_size, used_count, created_at, expires_at')
        .eq('license_key', licenseKey.trim().toUpperCase())
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setError('激活码不存在，请检查后重试');
        return;
      }

      if (data.used_count >= data.pack_size) {
        setError(`此激活码已用完（${data.used_count}/${data.pack_size}）`);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('此激活码已过期');
        return;
      }

      onActivated(data);
    } catch (err) {
      console.error('Activation error:', err);
      setError('查询失败，请稍后重试');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
            <Key className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">激活您的许可证</h1>
          <p className="text-gray-300">输入您购买的激活码以开始使用</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="license" className="block text-sm font-medium text-gray-300 mb-2">
              激活码
            </label>
            <input
              id="license"
              type="text"
              value={licenseKey}
              onChange={(e) => {
                setLicenseKey(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleActivate()}
              placeholder="VID-XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isChecking}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={isChecking || !licenseKey.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>验证中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>激活</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-400 text-center">
            还没有激活码？
            <a
              href="https://afdian.com/item/a0833bba986411efb67652540025c377"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 ml-1 transition-colors"
            >
              前往购买
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
