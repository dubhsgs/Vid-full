export interface CertificateData {
  characterName: string;
  creatorName: string;
  sha256Hash: string;
  timestamp: Date;
  avatarUrl?: string;
}

function generateCitizenId(hash: string): string {
  const part1 = hash.substring(0, 4).toUpperCase();
  const part2 = hash.substring(4, 8).toUpperCase();
  const part3 = hash.substring(8, 12).toUpperCase();
  return `V${part1}-${part2}-${part3}`;
}

export function generateCertificatePNG(
  canvas: HTMLCanvasElement,
  data: CertificateData
): Promise<string> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
    bgGradient.addColorStop(0, '#0d1f2d');
    bgGradient.addColorStop(0.5, '#09161f');
    bgGradient.addColorStop(1, '#040c12');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#06b6d4';
    const dotSpacing = 30;
    const dotSize = 1.5;
    for (let x = 2; x < width; x += dotSpacing) {
      for (let y = 2; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const length = 150 + Math.random() * 300;
      const angle = (Math.random() - 0.5) * Math.PI / 3;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      if (Math.random() > 0.6) {
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
        const branchLength = length * 0.3;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + Math.cos(branchAngle) * branchLength, midY + Math.sin(branchAngle) * branchLength);
        ctx.stroke();
      }
    }
    ctx.restore();

    const cardX = 100;
    const cardY = 100;
    const cardWidth = width - 200;
    const cardHeight = height - 200;
    const cornerRadius = 40;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cardX + cornerRadius, cardY);
    ctx.lineTo(cardX + cardWidth - cornerRadius, cardY);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + cornerRadius);
    ctx.lineTo(cardX + cardWidth, cardY + cardHeight - cornerRadius);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - cornerRadius, cardY + cardHeight);
    ctx.lineTo(cardX + cornerRadius, cardY + cardHeight);
    ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cornerRadius);
    ctx.lineTo(cardX, cardY + cornerRadius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + cornerRadius, cardY);
    ctx.closePath();

    const cardBgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 800);
    cardBgGradient.addColorStop(0, 'rgba(18, 40, 52, 0.7)');
    cardBgGradient.addColorStop(1, 'rgba(10, 25, 35, 0.82)');
    ctx.fillStyle = cardBgGradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineWidth = 3;
    const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY);
    borderGradient.addColorStop(0, '#06b6d4');
    borderGradient.addColorStop(0.5, '#7c3aed');
    borderGradient.addColorStop(1, '#a855f7');
    ctx.strokeStyle = borderGradient;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
    ctx.shadowBlur = 25;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const cornerHighlightSize = 30;
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(6, 182, 212, 1)';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(cardX, cardY + cornerRadius);
    ctx.lineTo(cardX, cardY + cornerHighlightSize);
    ctx.moveTo(cardX + cornerRadius, cardY);
    ctx.lineTo(cardX + cornerHighlightSize, cardY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cardX + cardWidth, cardY + cornerRadius);
    ctx.lineTo(cardX + cardWidth, cardY + cornerHighlightSize);
    ctx.moveTo(cardX + cardWidth - cornerRadius, cardY);
    ctx.lineTo(cardX + cardWidth - cornerHighlightSize, cardY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cardX, cardY + cardHeight - cornerRadius);
    ctx.lineTo(cardX, cardY + cardHeight - cornerHighlightSize);
    ctx.moveTo(cardX + cornerRadius, cardY + cardHeight);
    ctx.lineTo(cardX + cornerHighlightSize, cardY + cardHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cardX + cardWidth, cardY + cardHeight - cornerRadius);
    ctx.lineTo(cardX + cardWidth, cardY + cardHeight - cornerHighlightSize);
    ctx.moveTo(cardX + cardWidth - cornerRadius, cardY + cardHeight);
    ctx.lineTo(cardX + cardWidth - cornerHighlightSize, cardY + cardHeight);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    const logoX = width / 2;
    const logoY = 200;
    const logoSize = 70;

    ctx.save();
    ctx.translate(logoX, logoY);

    const logoGradient = ctx.createLinearGradient(-logoSize / 2, -logoSize / 2, logoSize / 2, logoSize / 2);
    logoGradient.addColorStop(0, '#a0e7e5');
    logoGradient.addColorStop(1, '#7dd3d0');
    ctx.fillStyle = logoGradient;

    ctx.beginPath();
    ctx.moveTo(0, -logoSize / 2);
    ctx.lineTo(-logoSize / 2.5, -logoSize / 5);
    ctx.lineTo(-logoSize / 2.5, logoSize / 5);
    ctx.lineTo(0, logoSize / 2);
    ctx.lineTo(logoSize / 2.5, logoSize / 5);
    ctx.lineTo(logoSize / 2.5, -logoSize / 5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'rgba(160, 231, 229, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = 'italic bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a3a3d';
    ctx.fillText('ViD', 0, 12);
    ctx.restore();

    ctx.fillStyle = '#9db4b8';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('V-ID PROTOCOL', logoX, logoY + 70);

    const avatarCenterX = 390;
    const avatarCenterY = height / 2 + 10;
    const avatarRadius = 155;

    ctx.save();
    const outerHexRadius = avatarRadius + 80;
    const hexSides = 6;
    ctx.strokeStyle = '#3d8891';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(61, 136, 145, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i <= hexSides; i++) {
      const angle = (i * 2 * Math.PI) / hexSides;
      const x = avatarCenterX + outerHexRadius * Math.cos(angle);
      const y = avatarCenterY + outerHexRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 4; i++) {
      const radius = avatarRadius + 48 + i * 3;
      const alpha = 0.15 - i * 0.03;
      ctx.save();
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.3)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const purpleRingGradient = ctx.createLinearGradient(avatarCenterX - avatarRadius, avatarCenterY, avatarCenterX + avatarRadius, avatarCenterY);
    purpleRingGradient.addColorStop(0, '#8b5cf6');
    purpleRingGradient.addColorStop(0.5, '#a855f7');
    purpleRingGradient.addColorStop(1, '#c084fc');
    ctx.strokeStyle = purpleRingGradient;
    ctx.lineWidth = 8;
    ctx.shadowColor = 'rgba(168, 85, 247, 1)';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const radius = avatarRadius + 18 + i * 2;
      const alpha = 0.25 - i * 0.05;
      ctx.save();
      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const cyanRingGradient = ctx.createLinearGradient(avatarCenterX - avatarRadius, avatarCenterY, avatarCenterX + avatarRadius, avatarCenterY);
    cyanRingGradient.addColorStop(0, '#06b6d4');
    cyanRingGradient.addColorStop(0.5, '#22d3ee');
    cyanRingGradient.addColorStop(1, '#67e8f9');
    ctx.strokeStyle = cyanRingGradient;
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(6, 182, 212, 1)';
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(10, 25, 35, 0.9)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (data.avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
        continueDrawing();
      };
      img.onerror = () => {
        drawPlaceholder();
        ctx.restore();
        continueDrawing();
      };
      img.src = data.avatarUrl;
    } else {
      drawPlaceholder();
      ctx.restore();
      continueDrawing();
    }

    function drawPlaceholder() {
      const placeholderGradient = ctx.createRadialGradient(avatarCenterX, avatarCenterY, 0, avatarCenterX, avatarCenterY, avatarRadius);
      placeholderGradient.addColorStop(0, '#234854');
      placeholderGradient.addColorStop(1, '#162e38');
      ctx.fillStyle = placeholderGradient;
      ctx.fillRect(avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    }

    function continueDrawing() {
      const dividerX = width / 2 + 20;
      const dividerY1 = height / 2 - 190;
      const dividerY2 = height / 2 + 190;

      const dividerGradient = ctx.createLinearGradient(dividerX, dividerY1, dividerX, dividerY2);
      dividerGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
      dividerGradient.addColorStop(0.5, 'rgba(6, 182, 212, 1)');
      dividerGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.strokeStyle = dividerGradient;
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(6, 182, 212, 1)';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.moveTo(dividerX, dividerY1);
      ctx.lineTo(dividerX, dividerY2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const infoX = dividerX + 130;
      let infoY = height / 2 - 160;

      ctx.fillStyle = '#5a7888';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('V-ID NAME:', infoX, infoY);

      infoY += 52;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px Arial, sans-serif';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 10;
      ctx.fillText(`[${data.characterName.toUpperCase()}]`, infoX, infoY);
      ctx.restore();

      infoY += 92;
      ctx.fillStyle = '#5a7888';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('STATUS:', infoX, infoY);

      infoY += 52;
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 50px Arial, sans-serif';
      ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText('VERIFIED', infoX, infoY);
      ctx.shadowBlur = 15;
      ctx.fillText('VERIFIED', infoX, infoY);
      ctx.shadowBlur = 25;
      ctx.fillText('VERIFIED', infoX, infoY);
      ctx.restore();

      infoY += 92;
      ctx.fillStyle = '#5a7888';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('ISSUED:', infoX, infoY);

      infoY += 52;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 46px Arial, sans-serif';
      const dateStr = data.timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).toUpperCase().replace(',', '');
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 8;
      ctx.fillText(dateStr, infoX, infoY);
      ctx.restore();

      infoY += 92;
      ctx.fillStyle = '#5a7888';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('CITIZEN ID:', infoX, infoY);

      infoY += 52;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 46px Arial, sans-serif';
      const citizenId = generateCitizenId(data.sha256Hash);
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 8;
      ctx.fillText(citizenId, infoX, infoY);
      ctx.restore();

      const qrX = width - 310;
      const qrY = height - 280;
      const qrSize = 145;

      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      const qrGridSize = 14.5;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if ((i + j) % 2 === 0 || (i % 3 === 0 && j % 3 === 0)) {
            ctx.fillRect(qrX + i * qrGridSize, qrY + j * qrGridSize, qrGridSize - 2, qrGridSize - 2);
          }
        }
      }
      ctx.restore();

      ctx.fillStyle = '#4a6270';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`HASH: ${data.sha256Hash.substring(0, 16)}...`, qrX + qrSize, qrY + qrSize + 22);
      ctx.fillText('PROOF: Verified by Digital Identity Technology', qrX + qrSize, qrY + qrSize + 35);

      ctx.fillStyle = '#4a6978';
      ctx.font = '13px Arial, sans-serif';
      ctx.textAlign = 'center';
      const footerText = 'THIS DOCUMENT CONSTITUTES FINAL PROOF OF A UNIQUE DIGITAL IDENTITY ANCHORED ON THE IMMUTABLE V-ID LEDGER.';
      ctx.fillText(footerText, width / 2, height - 85);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }
      });
    }
  });
}
