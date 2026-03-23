import { useEffect, useState } from 'react';

interface ForgingAnimationProps {
  avatarUrl: string | null;
  characterName: string;
  onComplete: () => void;
}

export function ForgingAnimation({ avatarUrl, characterName, onComplete }: ForgingAnimationProps) {
  const [stage, setStage] = useState<'scanning' | 'hashing' | 'anchoring' | 'secured'>('scanning');
  const [scanProgress, setScanProgress] = useState(0);
  const [hashChars, setHashChars] = useState('');

  useEffect(() => {
    const timeline = [
      { delay: 0, action: () => setStage('scanning') },
      { delay: 1500, action: () => setStage('hashing') },
      { delay: 3000, action: () => setStage('anchoring') },
      { delay: 4500, action: () => setStage('secured') },
      { delay: 5500, action: onComplete }
    ];

    const timers = timeline.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    if (stage === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 2;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'hashing') {
      const chars = '0123456789abcdef';
      const interval = setInterval(() => {
        setHashChars(prev => {
          if (prev.length >= 64) return prev;
          return prev + chars[Math.floor(Math.random() * chars.length)];
        });
      }, 25);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const getStageText = () => {
    switch (stage) {
      case 'scanning':
        return 'SCANNING DATA...';
      case 'hashing':
        return 'GENERATING SHA-256 HASH...';
      case 'anchoring':
        return 'ANCHORING TO BITCOIN NETWORK VIA OTS...';
      case 'secured':
        return 'TIMESTAMP SECURED';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-green-950/30" />

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.3
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl px-4">
        <div className="mb-8">
          {stage === 'scanning' && avatarUrl && (
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-blue-500">
                <img
                  src={avatarUrl}
                  alt={characterName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div
                className="absolute left-0 right-0 h-1 bg-blue-400 shadow-lg shadow-blue-500"
                style={{
                  top: `${scanProgress}%`,
                  transition: 'top 0.03s linear'
                }}
              >
                <div className="absolute inset-0 bg-blue-300 blur-sm" />
              </div>

              <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-ping opacity-20" />
            </div>
          )}

          {(stage === 'hashing' || stage === 'anchoring' || stage === 'secured') && (
            <div className="w-[500px] h-64 flex items-center justify-center">
              <div
                className={`font-mono text-sm tracking-wider break-all leading-relaxed text-center transition-all duration-500 ${
                  stage === 'secured' ? 'text-green-400 scale-110' : 'text-blue-400'
                }`}
              >
                {hashChars}
                {hashChars.length < 64 && (
                  <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {stage === 'anchoring' && (
            <div className="mt-8 relative w-64 h-32 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 256 128">
                {[...Array(8)].map((_, i) => (
                  <circle
                    key={i}
                    cx={32 + i * 32}
                    cy={64}
                    r={4}
                    fill="#60a5fa"
                    className="animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
                {[...Array(7)].map((_, i) => (
                  <line
                    key={i}
                    x1={36 + i * 32}
                    y1={64}
                    x2={60 + i * 32}
                    y2={64}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    className="animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </svg>

              <div
                className="absolute top-0 left-0 w-8 h-8 bg-green-500 rounded-full animate-bounce"
                style={{ animationDuration: '1s' }}
              />
            </div>
          )}

          {stage === 'secured' && (
            <div className="flex items-center justify-center mt-8">
              <div className="w-24 h-24 bg-green-500/20 border-4 border-green-500 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  className="w-12 h-12 text-green-400"
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
            </div>
          )}
        </div>

        <div className="text-center">
          <div
            className={`text-2xl font-bold tracking-widest mb-4 transition-all duration-500 ${
              stage === 'secured' ? 'text-green-400 scale-110' : 'text-blue-400'
            }`}
          >
            {getStageText()}
          </div>

          <div className="text-slate-400 text-sm">
            {stage === 'scanning' && 'Analyzing identity data...'}
            {stage === 'hashing' && 'Creating cryptographic fingerprint...'}
            {stage === 'anchoring' && 'Broadcasting to blockchain network...'}
            {stage === 'secured' && 'Identity successfully forged and secured!'}
          </div>
        </div>

        {stage !== 'secured' && (
          <div className="mt-8 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
