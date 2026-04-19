import { useState } from 'react';
import { Shield, CheckCircle, Upload } from 'lucide-react';

interface InteractiveVIDCardProps {
  initialName?: string;
  initialAvatar?: string;
  onNameChange?: (name: string) => void;
  onAvatarChange?: (avatar: string) => void;
}

export function InteractiveVIDCard({
  initialName = 'ELIZA REED',
  initialAvatar,
  onNameChange,
  onAvatarChange,
}: InteractiveVIDCardProps) {
  const [avatar, setAvatar] = useState<string | null>(initialAvatar || null);
  const [name, setName] = useState(initialName);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
      onAvatarChange?.(url);
    }
  };

  const handleNameChange = (newName: string) => {
    const upperName = newName.toUpperCase();
    setName(upperName);
    onNameChange?.(upperName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-slate-200">
      <div className="mb-10 flex gap-4 items-center bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="bg-black/50 border border-white/10 px-4 py-2 rounded font-mono text-sm focus:outline-none focus:border-cyan-500"
          placeholder="ENTER NAME"
        />
        <label className="cursor-pointer bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded flex items-center gap-2 text-sm transition-all">
          <Upload size={16} /> UPLOAD AVATAR
          <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
        </label>
      </div>

      <div className="relative w-[850px] aspect-[1.7/1] rounded-[24px] p-10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] group">
        <div className="absolute inset-0 bg-[#0c0d0f]/90 backdrop-blur-3xl border-[1.5px] border-white/10 rounded-[24px]"></div>

        <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_0_40px_rgba(6,182,212,0.1)] pointer-events-none"></div>

        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(6,182,212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212, 0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        ></div>

        <div className="relative z-10 flex flex-col items-center mb-10">
          <div className="relative">
            <Shield className="w-12 h-12 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" strokeWidth={1.5} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold tracking-tighter text-white">
              V-ID
            </div>
          </div>
          <div className="text-[10px] tracking-[0.5em] text-cyan-400/60 mt-2 font-mono">V-ID PROTOCOL</div>
        </div>

        <div className="relative z-10 flex items-center justify-between px-6">
          <div className="relative w-[220px] h-[220px]">
            <div className="absolute inset-0 rounded-full border-[1px] border-cyan-500/30 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-[3px] border-zinc-800 p-1 bg-black overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="Portrait" />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs text-center px-6">
                  WAITING FOR UPLOAD...
                </div>
              )}
            </div>
            <div className="absolute -inset-4 rounded-full border-[1px] border-purple-500/20 rotate-45"></div>
          </div>

          <div className="h-40 w-[1.5px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent mx-4"></div>

          <div className="flex-1 space-y-5 font-mono">
            <div>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">V-ID Name</p>
              <h2 className="text-2xl text-white font-medium tracking-tight">[{name || 'UNKNOWN'}]</h2>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">Status</p>
              <div className="text-2xl text-[#50e3a0] flex items-center gap-3 drop-shadow-[0_0_10px_rgba(80,227,160,0.4)]">
                VERIFIED <CheckCircle size={20} fill="#50e3a0" className="text-black" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">Issued</p>
                <p className="text-xl text-white/90">MAR 13, 2026</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">Citizen ID</p>
                <p className="text-xl text-white/90">V873-Q92X-P014</p>
              </div>
            </div>
          </div>

          <div className="ml-10 flex flex-col items-center opacity-60">
            <div className="w-16 h-16 bg-purple-500/20 rounded border border-purple-500/40 p-1 mb-2">
              <div className="w-full h-full bg-zinc-900 grid grid-cols-4 grid-rows-4 gap-1 p-1">
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className={`bg-purple-400/60 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-20'}`}
                  ></div>
                ))}
              </div>
            </div>
            <p className="text-[7px] text-zinc-500 leading-[1.2] text-center font-mono">
              HASH: 0x93b7e4f1c...
              <br />
              VERIFIED BY BLOCKCHAIN
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 w-full text-center px-12">
          <p className="text-[8px] text-zinc-500 tracking-[0.3em] font-mono leading-loose">
            THIS DOCUMENT CONSTITUTES FINAL PROOF OF A UNIQUE DIGITAL IDENTITY ANCHORED ON THE IMMUTABLE V-ID LEDGER.
          </p>
        </div>
      </div>
    </div>
  );
}
