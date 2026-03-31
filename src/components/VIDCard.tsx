import { useEffect, useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface VIDCardProps {
  characterName: string;
  avatarUrl?: string;
  citizenId: string;
  issuedDate: string;
  hash: string;
  qrCodeUrl?: string;
  useTemplate?: boolean;
}

export function VIDCard({
  characterName,
  avatarUrl,
  citizenId,
  issuedDate,
  hash,
  useTemplate = true,
}: VIDCardProps) {
  const [templateLoaded, setTemplateLoaded] = useState(false);

  useEffect(() => {
    if (useTemplate) {
      const img = new Image();
      img.src = '/VID.jpg';
      img.onload = () => setTemplateLoaded(true);
      img.onerror = () => setTemplateLoaded(false);
    }
  }, [useTemplate]);

  if (useTemplate) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#040c12] p-8">
        <div
          className="relative"
          style={{
            width: '1440px',
            height: '810px',
            maxWidth: '95vw',
            aspectRatio: '16/9',
            backgroundImage: templateLoaded ? 'url(/VID.jpg)' : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: templateLoaded ? 'transparent' : '#0a1824',
            borderRadius: '16px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: `
              0 0 60px rgba(0, 0, 0, 0.8),
              0 0 40px rgba(6, 182, 212, 0.2),
              inset 0 0 100px rgba(6, 182, 212, 0.05)
            `,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: '-50px',
              left: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-50px',
              left: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {avatarUrl && (
            <div
              className="absolute"
              style={{
                left: '9.5%',
                top: '27.5%',
                width: '19%',
                aspectRatio: '1/1',
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{
                  clipPath: 'circle(50% at 50% 50%)',
                  boxShadow: `
                    0 0 40px rgba(6, 182, 212, 0.6),
                    0 0 80px rgba(168, 85, 247, 0.4),
                    0 0 120px rgba(236, 72, 153, 0.3),
                    inset 0 0 30px rgba(6, 182, 212, 0.2)
                  `,
                }}
              >
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: 'center',
                  }}
                />
              </div>
            </div>
          )}

          <div
            className="absolute"
            style={{
              left: '36%',
              top: '20%',
              width: '4px',
              height: '60%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.8) 20%, rgba(6, 182, 212, 1) 50%, rgba(6, 182, 212, 0.8) 80%, transparent 100%)',
              boxShadow: `
                0 0 20px rgba(6, 182, 212, 0.8),
                0 0 40px rgba(6, 182, 212, 0.5),
                0 0 60px rgba(6, 182, 212, 0.3)
              `,
            }}
          />

          <div
            className="absolute bg-[#1a3540]"
            style={{
              left: '46%',
              top: '37%',
              width: '32%',
              height: '5.5%',
            }}
          />
          <div
            className="absolute font-mono font-bold text-white"
            style={{
              left: '46%',
              top: '37.2%',
              fontSize: 'clamp(20px, 2.6vw, 38px)',
              textShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.02em',
            }}
          >
            [{characterName.toUpperCase()}]
          </div>

          <div
            className="absolute bg-[#1a3540]"
            style={{
              left: '46%',
              top: '46%',
              width: '28%',
              height: '5.5%',
            }}
          />
          <div
            className="absolute font-mono font-bold text-[#4ade80]"
            style={{
              left: '46%',
              top: '46.2%',
              fontSize: 'clamp(20px, 2.6vw, 38px)',
              textShadow:
                '0 0 8px rgba(74, 222, 128, 0.9), 0 0 16px rgba(74, 222, 128, 0.6), 0 0 24px rgba(74, 222, 128, 0.4)',
              letterSpacing: '0.06em',
            }}
          >
            VERIFIED
          </div>

          <div
            className="absolute bg-[#1a3540]"
            style={{
              left: '46%',
              top: '55.5%',
              width: '30%',
              height: '5%',
            }}
          />
          <div
            className="absolute font-mono font-bold text-white"
            style={{
              left: '46%',
              top: '55.8%',
              fontSize: 'clamp(18px, 2.4vw, 35px)',
              textShadow: '0 0 6px rgba(255, 255, 255, 0.25)',
              letterSpacing: '0.03em',
            }}
          >
            {issuedDate}
          </div>

          <div
            className="absolute bg-[#1a3540]"
            style={{
              left: '46%',
              top: '64.5%',
              width: '38%',
              height: '5%',
            }}
          />
          <div
            className="absolute font-mono font-bold text-white"
            style={{
              left: '46%',
              top: '64.8%',
              fontSize: 'clamp(18px, 2.4vw, 35px)',
              textShadow: '0 0 6px rgba(255, 255, 255, 0.25)',
              letterSpacing: '0.06em',
            }}
          >
            {citizenId}
          </div>

          <div
            className="absolute"
            style={{
              right: '4.5%',
              bottom: '8.5%',
              width: '14%',
              height: '4%',
              backgroundColor: 'rgba(26, 53, 64, 0.8)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)',
            }}
          />
          <div
            className="absolute text-right font-mono"
            style={{
              right: '5%',
              bottom: '9%',
            }}
          >
            <div
              className="text-[#6b8a9a] mb-1"
              style={{ fontSize: 'clamp(5px, 0.55vw, 8px)' }}
            >
              HASH: {hash.substring(0, 16)}...
            </div>
            <div
              className="text-[#6b8a9a]"
              style={{ fontSize: 'clamp(5px, 0.55vw, 8px)' }}
            >
              PROOF: Verified by Digital Identity Technology
            </div>
          </div>

          {!templateLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-cyan-400 text-sm">Loading certificate template...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] p-8">
      <div className="relative w-[850px] aspect-[1.7/1] rounded-[24px] p-10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">
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
              {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover" alt="Portrait" />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-xs text-center px-6">
                  NO AVATAR
                </div>
              )}
            </div>
            <div className="absolute -inset-4 rounded-full border-[1px] border-purple-500/20 rotate-45"></div>
          </div>

          <div className="h-40 w-[1.5px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent mx-4"></div>

          <div className="flex-1 space-y-5 font-mono">
            <div>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">V-ID Name</p>
              <h2 className="text-2xl text-white font-medium tracking-tight">[{characterName.toUpperCase()}]</h2>
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
                <p className="text-xl text-white/90">{issuedDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">Citizen ID</p>
                <p className="text-xl text-white/90">{citizenId}</p>
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
              HASH: {hash.substring(0, 10)}...
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
