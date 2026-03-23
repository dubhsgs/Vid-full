import { useEffect, useState, useRef } from 'react';

interface ForgingAnimationProps {
  avatarUrl: string | null;
  characterName: string;
  onComplete: () => void;
}

export function ForgingAnimation({ avatarUrl, characterName, onComplete }: ForgingAnimationProps) {
  const [stage, setStage] = useState<'scanning' | 'hashing' | 'anchoring' | 'secured'>('scanning');
  const [scanProgress, setScanProgress] = useState(0);
  const [hashChars, setHashChars] = useState('');
  const [charStates, setCharStates] = useState<Array<'pending' | 'active' | 'locked'>>([]);
  const [rippleActive, setRippleActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    console.log('ForgingAnimation mounted, starting timeline');

    const timeline = [
      { delay: 0, action: () => {
        console.log('Stage: scanning');
        setStage('scanning');
      }},
      { delay: 1500, action: () => {
        console.log('Stage: hashing');
        setStage('hashing');
      }},
      { delay: 3000, action: () => {
        console.log('Stage: anchoring');
        setStage('anchoring');
        setRippleActive(true);
        setTimeout(() => setRippleActive(false), 800);
      }},
      { delay: 4500, action: () => {
        console.log('Stage: secured');
        setStage('secured');
      }},
      { delay: 5500, action: () => {
        console.log('Animation complete, calling onComplete');
        onCompleteRef.current();
      }}
    ];

    const timers = timeline.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => {
      console.log('ForgingAnimation unmounting, clearing timers');
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (stage === 'scanning') {
      setLogs(['> INITIALIZING BIOMETRIC SCAN...', '> LOADING QUANTUM CORE...']);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    } else if (stage === 'hashing') {
      setLogs(['> INJECTING SEED...', '> GENERATING CRYPTOGRAPHIC HASH...', '> SHA-256 PROTOCOL ACTIVE...']);
    } else if (stage === 'anchoring') {
      setLogs(['> ESTABLISHING AD-HOC NODE...', '> BROADCASTING TO NETWORK...', '> PROTOCOL SECURED.']);
    } else if (stage === 'secured') {
      setLogs(['> TIMESTAMP VERIFIED', '> IDENTITY LOCKED', '> SYSTEM READY']);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'hashing') {
      const chars = '0123456789abcdef';
      const targetLength = 64;
      const states = new Array(targetLength).fill('pending');
      setCharStates(states);

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex >= targetLength) {
          clearInterval(interval);
          return;
        }

        setCharStates(prev => {
          const newStates = [...prev];
          if (currentIndex > 0) {
            newStates[currentIndex - 1] = 'locked';
          }
          newStates[currentIndex] = 'active';
          return newStates;
        });

        setHashChars(prev => prev + chars[Math.floor(Math.random() * chars.length)]);
        currentIndex++;
      }, 25);

      return () => clearInterval(interval);
    }
  }, [stage]);

  const getStageText = () => {
    switch (stage) {
      case 'scanning':
        return 'SCANNING DATA';
      case 'hashing':
        return 'GENERATING SHA-256 HASH';
      case 'anchoring':
        return 'ANCHORING TO BITCOIN NETWORK';
      case 'secured':
        return 'TIMESTAMP SECURED';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex items-center justify-center overflow-hidden">
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }}
      />

      {/* Ripple Effect */}
      {rippleActive && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'ripple 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards'
            }}
          >
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"
              style={{
                transform: 'translate(-50%, -50%) scale(0)',
                left: '50%',
                top: '50%',
                animation: 'expand 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards'
              }}
            />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'ripple 0.8s cubic-bezier(0.65, 0, 0.35, 1) 0.2s forwards'
            }}
          >
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"
              style={{
                transform: 'translate(-50%, -50%) scale(0)',
                left: '50%',
                top: '50%',
                animation: 'expand 0.8s cubic-bezier(0.65, 0, 0.35, 1) 0.2s forwards'
              }}
            />
          </div>
        </>
      )}

      {/* CRT Scanline Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 2px'
        }}
      />

      {/* Noise Grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
        }}
      />

      {/* Log Console */}
      <div className="absolute top-8 left-8 font-mono text-xs text-green-400/60 space-y-1 max-w-md">
        {logs.map((log, i) => (
          <div key={i} className="animate-[slideIn_0.3s_ease-out] opacity-0" style={{ animationDelay: `${i * 0.2}s`, animationFillMode: 'forwards' }}>
            {log}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl px-4">
        <div className="mb-8">
          {stage === 'scanning' && avatarUrl && (
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-blue-500/50">
                <img
                  src={avatarUrl}
                  alt={characterName}
                  className="w-full h-full object-cover"
                />

                {/* Scan Afterglow */}
                <div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent pointer-events-none"
                  style={{
                    top: `${scanProgress}%`,
                    height: '40px',
                    transform: 'translateY(-20px)',
                    filter: 'blur(10px)'
                  }}
                />
              </div>

              {/* Laser Scanning Line with Glow */}
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${scanProgress}%`,
                  transition: 'top 0.03s cubic-bezier(0.65, 0, 0.35, 1)'
                }}
              >
                <div
                  className="h-[3px] bg-white"
                  style={{
                    boxShadow: '0 0 20px 8px rgba(59, 130, 246, 0.8), 0 0 40px 15px rgba(59, 130, 246, 0.4)'
                  }}
                />
              </div>

              <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full" />
            </div>
          )}

          {(stage === 'hashing' || stage === 'anchoring' || stage === 'secured') && (
            <div className="w-[600px] h-64 flex items-center justify-center">
              <div
                className="font-mono text-base tracking-[0.3em] break-all leading-relaxed text-center transition-all duration-500"
                style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
              >
                {hashChars.split('').map((char, i) => {
                  let colorClass = 'text-gray-700';
                  if (charStates[i] === 'active') {
                    colorClass = 'text-blue-400 animate-[glow_0.3s_ease-in-out]';
                  } else if (charStates[i] === 'locked') {
                    colorClass = stage === 'secured' ? 'text-green-400' : 'text-white';
                  }

                  return (
                    <span key={i} className={`${colorClass} transition-colors duration-200`}>
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {stage === 'anchoring' && (
            <div className="mt-8 relative w-80 h-32 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 320 128">
                {[...Array(9)].map((_, i) => (
                  <g key={i}>
                    <circle
                      cx={40 + i * 35}
                      cy={64}
                      r={6}
                      fill="#60a5fa"
                      opacity={0.8}
                    />
                    <circle
                      cx={40 + i * 35}
                      cy={64}
                      r={10}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="1"
                      opacity={0.3}
                    />
                  </g>
                ))}
                {[...Array(8)].map((_, i) => (
                  <line
                    key={i}
                    x1={46 + i * 35}
                    y1={64}
                    x2={74 + i * 35}
                    y2={64}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity={0.6}
                  />
                ))}
              </svg>
            </div>
          )}

          {stage === 'secured' && (
            <div className="flex items-center justify-center mt-8">
              <div className="relative">
                <div className="w-32 h-32 bg-green-500/10 border-4 border-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="absolute inset-0 border-4 border-green-500/30 rounded-full animate-[ping_1s_ease-out]" />
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <div
            className={`font-mono text-2xl font-bold tracking-[0.3em] mb-4 transition-all duration-500 ${
              stage === 'secured' ? 'text-green-400' : 'text-blue-400'
            }`}
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              textShadow: stage === 'secured' ? '0 0 20px rgba(34, 197, 94, 0.5)' : '0 0 20px rgba(59, 130, 246, 0.5)'
            }}
          >
            {getStageText()}
          </div>

          <div className="font-mono text-slate-500 text-sm tracking-wider">
            {stage === 'scanning' && '[ ANALYZING IDENTITY DATA ]'}
            {stage === 'hashing' && '[ CREATING CRYPTOGRAPHIC FINGERPRINT ]'}
            {stage === 'anchoring' && '[ BROADCASTING TO BLOCKCHAIN NETWORK ]'}
            {stage === 'secured' && '[ IDENTITY SUCCESSFULLY FORGED AND SECURED ]'}
          </div>
        </div>

        {stage !== 'secured' && (
          <div className="mt-8 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400/60 rounded-full"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 0.6;
            transform: translateX(0);
          }
        }

        @keyframes expand {
          from {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }

        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
          }
          50% {
            text-shadow: 0 0 20px rgba(59, 130, 246, 1), 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
