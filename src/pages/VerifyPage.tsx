import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, ExternalLink, Loader2, AlertCircle, Calendar, User, Hash } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface VIDRecord {
  id: string;
  character_name: string;
  creator_name: string;
  sha256_hash: string;
  created_at: string;
}

export function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<VIDRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id) {
        setError('Invalid verification ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('v_ids')
          .select('id, character_name, creator_name, sha256_hash, created_at')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError('No record found for this Citizen ID');
        } else {
          setRecord(data);
        }
      } catch (err) {
        console.error('Error fetching record:', err);
        setError('Failed to verify record');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handleVerifyOnOTS = () => {
    if (record?.sha256_hash) {
      window.open(`https://opentimestamps.org/?hash=${record.sha256_hash}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Verifying V-ID Record...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-green-950/20 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <button
          onClick={() => navigate('/')}
          className="mb-8 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 border-2 border-green-500/30 rounded-full mb-6">
            <Shield className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-4xl font-bold mb-2">V-ID Verification</h1>
          <p className="text-slate-400">Digital Identity Record Confirmed</p>
        </div>

        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="grid gap-6">
            <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <User className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-1">Character Name</div>
                <div className="text-2xl font-bold text-white">{record.character_name}</div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <User className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-1">Creator</div>
                <div className="text-xl font-semibold text-white">{record.creator_name}</div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-1">Citizen ID</div>
                <div className="text-lg font-mono text-white break-all">{record.id}</div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-1">Registration Date</div>
                <div className="text-lg text-white">{formatDate(record.created_at)}</div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 border-2 border-green-500/30 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <Hash className="w-7 h-7 text-green-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-400 mb-2">SHA-256 DIGITAL FINGERPRINT</div>
                  <div className="text-base font-mono text-white break-all leading-relaxed bg-black/30 p-4 rounded-lg border border-green-500/20">
                    {record.sha256_hash}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4 pl-11">
                This cryptographic hash serves as the immutable digital fingerprint of this V-ID record,
                providing tamper-proof verification of existence at the registered timestamp.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={handleVerifyOnOTS}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/30 group"
              >
                <Shield className="w-5 h-5" />
                <span>Independently Verify on OpenTimestamps Official Site</span>
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                Click to verify this hash's timestamp on the Bitcoin blockchain via OpenTimestamps.org
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">About This Verification</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            This V-ID record is permanently registered in our decentralized identity ledger.
            The SHA-256 hash provides cryptographic proof of this identity's existence at the recorded timestamp.
            For independent verification of the timestamp's authenticity, you can verify the hash on the
            OpenTimestamps official website, which anchors proofs to the Bitcoin blockchain.
          </p>
        </div>
      </div>
    </div>
  );
}
