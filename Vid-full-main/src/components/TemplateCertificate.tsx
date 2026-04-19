import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface TemplateCertificateProps {
  characterName: string;
  citizenId: string;
  issuedDate: string;
  avatarUrl?: string;
  hash: string;
}

export function TemplateCertificate({
  characterName,
  citizenId,
  issuedDate,
  hash,
}: TemplateCertificateProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(`https://v-id.protocol/${citizenId}`, {
      width: 120,
      margin: 1,
      color: {
        dark: '#FFFFFF',
        light: '#0A0A0A',
      },
    }).then(setQrCodeUrl);
  }, [citizenId]);

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="relative bg-[#0A0A0A] border border-[#1F2937]"
        style={{
          width: '1024px',
          height: '576px',
        }}
      >
        <div className="absolute inset-0 p-20 flex flex-col">
          <div className="flex justify-between items-start mb-16">
            <div className="text-white text-xl font-mono tracking-wider">
              V-ID PROTOCOL
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-mono">STATUS:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                <span className="text-[#4ADE80] text-sm font-mono">VERIFIED</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10 flex-1">
            <div>
              <div className="text-gray-500 text-sm font-mono mb-2">CITIZEN NAME</div>
              <div className="text-white text-3xl font-mono">[{characterName.toUpperCase()}]</div>
            </div>

            <div>
              <div className="text-gray-500 text-sm font-mono mb-2">REGISTRATION DATE</div>
              <div className="text-white text-lg font-mono">{issuedDate}</div>
            </div>

            <div>
              <div className="text-gray-500 text-sm font-mono mb-2">V-ID ACCESS CODE</div>
              <div className="text-white text-xl font-mono tracking-wider">{citizenId}</div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-10 border-t border-gray-800">
            <div>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
              )}
            </div>
            <div className="w-2/3 text-right">
              <div className="text-gray-600 text-xs font-mono break-all leading-relaxed">
                {hash}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
