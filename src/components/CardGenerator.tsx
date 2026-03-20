import React, { useEffect, useRef, useState } from 'react';
import { Download, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CANVAS_W = 1000;
const CANVAS_H = 650;
const DIVIDER_X = 420;
const AVATAR_CENTER_X = 210;
const AVATAR_CENTER_Y = 325;
const AVATAR_RADIUS = 145;

const CardGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  
  const characterName = localStorage.getItem('vid_character_name') || 'UNKNOWN SUBJECT';
  const hash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  useEffect(() => {
    const avatarSrc = localStorage.getItem('vid_uploaded_avatar');
    if (!avatarSrc) {
      navigate('/');
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarSrc;
    img.onload = () => setAvatarImg(img);
  }, [navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !avatarImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 背景绘制
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2. 专业蓝图网格绘制
    // 次级网格
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
    for (let x = 0; x <= CANVAS_W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); }
    for (let y = 0; y <= CANVAS_H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); }
    ctx.stroke();

    // 主网格
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= CANVAS_W; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); }
    for (let y = 0; y <= CANVAS_H; y += 100) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); }
    ctx.stroke();

    // 3. 头像精准还原逻辑
    const savedScale = parseFloat(localStorage.getItem('vid_avatar_scale') || '1');
    const savedX = parseFloat(localStorage.getItem('vid_avatar_x') || '0');
    const savedY = parseFloat(localStorage.getItem('vid_avatar_y') || '0');
    // UI预览区(320px)到Canvas区(290px)的缩放系数
    const uiToCanvasRatio = (AVATAR_RADIUS * 2) / 320; 

    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    const drawW = (AVATAR_RADIUS * 2) * savedScale;
    const drawH = (AVATAR_RADIUS * 2) * savedScale;
    
    ctx.drawImage(
      avatarImg,
      AVATAR_CENTER_X - (drawW / 2) + (savedX * uiToCanvasRatio),
      AVATAR_CENTER_Y - (drawH / 2) + (savedY * uiToCanvasRatio),
      drawW,
      drawH
    );
    ctx.restore();

    // 蓝色外发光圆环
    ctx.beginPath();
    ctx.arc(AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. 文字内容区域
    const textX = DIVIDER_X + 50;
    
    // 垂直分割线
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.moveTo(DIVIDER_X, 100); ctx.lineTo(DIVIDER_X, 550);
    ctx.stroke();

    // 标题与身份信息
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 14px "JetBrains Mono"';
    ctx.fillText("V-ID CARD // VERSION 2.1", textX, 180);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px "Inter"';
    ctx.fillText(characterName.toUpperCase(), textX, 240);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillText("NETWORK HASH:", textX, 300);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px "JetBrains Mono"';
    ctx.fillText(hash, textX, 325);

  }, [avatarImg, characterName]);

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = `V-ID-${characterName}.png`;
    link.href = canvasRef.current?.toDataURL() || '';
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="bg-[#111] p-8 rounded-3xl border border-white/10 shadow-2xl">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="max-w-full rounded-xl shadow-inner border border-white/5" />
        
        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-2 transition-all font-mono text-sm">
            <Home className="w-4 h-4" /> 返回首页
          </button>
          <button onClick={downloadImage} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-2 transition-all font-bold text-sm">
            <Download className="w-4 h-4" /> 导出身份卡
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardGenerator;