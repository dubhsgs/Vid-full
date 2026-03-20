import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

const CANVAS_W = 1024;
const CANVAS_H = 576;
const DPR = 2;
const REAL_W = CANVAS_W * DPR;
const REAL_H = CANVAS_H * DPR;

const AVATAR_COLOR_START = '#b8dce8';
const AVATAR_COLOR_END = '#e040a0';
const QR_COLOR = '#de6aa8';

const EDITOR_SIZE = 300;
const CROP_RADIUS = 120;

interface FormData {
  name: string;
  status: string;
  issuedDate: string;
  serialId: string;
  description: string;
  qrContent: string;
  qrToken: string;
  qrRecord: string;
}

export function CardGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    name: 'ELIZA REED',
    status: 'VERIFIED',
    issuedDate: '',
    serialId: '',
    description: 'THIS SIMPLE NOTE SHOWS A LOVELY STORY OF A HAPPY CHILD PLAYING IN THE SUNNY PARK.',
    qrContent: '',
    qrToken: 'ABGD',
    qrRecord: 'SECURE DATA PROOF',
  });

  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [showInfoEditor, setShowInfoEditor] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [rawAvatarImg, setRawAvatarImg] = useState<HTMLImageElement | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({
    x: 0,
    y: 0,
    scale: 1,
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const formatIssuedDate = useCallback((date = new Date()) => {
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }, []);

  const generateSerialId = useCallback(() => {
    const now = Date.now();
    const ts = now.toString(36).toUpperCase().slice(-6);
    const seq = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `V${ts.slice(0, 3)}-${ts.slice(3)}${seq.slice(0, 1)}-${seq.slice(1)}${now.toString(16).toUpperCase().slice(-3)}`;
  }, []);

  useEffect(() => {
    const issuedDate = formatIssuedDate();
    const serialId = generateSerialId();
    setForm(prev => ({
      ...prev,
      issuedDate,
      serialId,
      qrContent: `https://example.com/verify/${serialId}`,
    }));
  }, [formatIssuedDate, generateSerialId]);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [bg, logo] = await Promise.all([
          loadImage('/bg.jpg'),
          loadImage('/logo.png'),
        ]);
        setBgImg(bg);
        setLogoImg(logo);

        const savedAvatar = localStorage.getItem('vid_uploaded_avatar');
        if (savedAvatar) {
          const avatarImage = await loadImage(savedAvatar);
          setAvatarImg(avatarImage);
        }
      } catch (e) {
        console.error('Failed to load resources:', e);
      }
    };
    loadResources();
  }, [loadImage]);

  const generateQR = useCallback(async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(form.qrContent, {
        width: 240,
        margin: 1,
        color: { dark: '#000000', light: '#00000000' },
        errorCorrectionLevel: 'M',
      });
      const img = await loadImage(qrDataUrl);
      setQrImg(img);
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  }, [form.qrContent, loadImage]);

  useEffect(() => {
    if (form.qrContent) {
      generateQR();
    }
  }, [form.qrContent, generateQR]);

  const hexToRgba = (hex: string, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
      sh = img.height;
      sw = sh * boxRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawPanel = (ctx: CanvasRenderingContext2D) => {
    const px = 45, py = 28, pw = 934, ph = 520, r = 18;

    if (bgImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, px, py, pw, ph, r);
      ctx.clip();
      ctx.filter = 'blur(3px) brightness(0.92)';
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
      ctx.filter = 'none';
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.fillStyle = 'rgba(18, 22, 34, 0.14)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.clip();
    const cornerGlows = [
      { x: px + 8, y: py + 8 },
      { x: px + pw - 8, y: py + 8 },
      { x: px + 8, y: py + ph - 8 },
      { x: px + pw - 8, y: py + ph - 8 },
    ];
    cornerGlows.forEach(({ x, y }) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 128);
      glow.addColorStop(0, 'rgba(210, 230, 255, 0.24)');
      glow.addColorStop(0.22, 'rgba(210, 230, 255, 0.14)');
      glow.addColorStop(0.5, 'rgba(170, 205, 255, 0.08)');
      glow.addColorStop(1, 'rgba(170, 205, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 128, y - 128, 256, 256);
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(200, 215, 240, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(140, 180, 255, 0.12)';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    roundRect(ctx, px, py, pw, ph, r);
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.restore();
  };

  const drawLogo = (ctx: CanvasRenderingContext2D) => {
    if (!logoImg) return;
    const logoH = 60;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    const lx = (CANVAS_W - logoW) / 2;
    const ly = 45;
    ctx.drawImage(logoImg, lx, ly, logoW, logoH);

    ctx.save();
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(200, 210, 230, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('GLOBAL ASSET REGISTRY', CANVAS_W / 2, ly + logoH + 18);
    ctx.restore();
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D) => {
    const cx = 210, cy = 310, outerR = 100, innerR = 88;

    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy + 10, innerR - 5, cx, cy + 10, outerR + 20);
    glow.addColorStop(0, hexToRgba(AVATAR_COLOR_END, 0));
    glow.addColorStop(0.5, hexToRgba(AVATAR_COLOR_END, 0.12));
    glow.addColorStop(0.8, hexToRgba(AVATAR_COLOR_START, 0.08));
    glow.addColorStop(1, hexToRgba(AVATAR_COLOR_START, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 20, 0, Math.PI * 2);
    ctx.fill();

    const ringGrad = ctx.createLinearGradient(cx, cy - outerR, cx, cy + outerR);
    ringGrad.addColorStop(0, AVATAR_COLOR_START);
    ringGrad.addColorStop(0.45, AVATAR_COLOR_START);
    ringGrad.addColorStop(0.65, AVATAR_COLOR_END);
    ringGrad.addColorStop(1, AVATAR_COLOR_END);
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 18, 30, 0.8)';
    ctx.fill();

    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
      ctx.clip();
      const size = innerR * 2 - 4;
      ctx.drawImage(avatarImg, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(100, 120, 160, 0.3)';
      ctx.font = '40px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', cx, cy);
    }
    ctx.restore();
  };

  const drawDividerLine = (ctx: CanvasRenderingContext2D) => {
    const lx = 340, ly1 = 170, ly2 = 455;
    ctx.save();
    const glow = ctx.createLinearGradient(lx - 8, ly1, lx + 8, ly1);
    glow.addColorStop(0, 'rgba(160, 190, 240, 0)');
    glow.addColorStop(0.28, 'rgba(160, 190, 240, 0.10)');
    glow.addColorStop(0.5, 'rgba(160, 190, 240, 0.16)');
    glow.addColorStop(0.72, 'rgba(160, 190, 240, 0.10)');
    glow.addColorStop(1, 'rgba(160, 190, 240, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 8, ly1, 16, ly2 - ly1);

    const core = ctx.createLinearGradient(lx - 1.5, ly1, lx + 1.5, ly1);
    core.addColorStop(0, 'rgba(210, 225, 255, 0.18)');
    core.addColorStop(0.5, 'rgba(210, 225, 255, 0.55)');
    core.addColorStop(1, 'rgba(210, 225, 255, 0.18)');
    ctx.fillStyle = core;
    ctx.fillRect(lx - 1.5, ly1, 3, ly2 - ly1);
    ctx.restore();
  };

  const drawTextFields = (ctx: CanvasRenderingContext2D) => {
    const startX = 370;
    const labelStyle = 'rgba(180, 190, 210, 0.7)';
    const valueStyle = '#ffffff';
    const greenStyle = '#00e676';

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let y = 215;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('NAME:', startX, y);
    const nameOffset = ctx.measureText('NAME: ').width;
    ctx.font = '700 30px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.name, startX + nameOffset + 4, y);

    y = 278;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('STATUS:', startX, y);
    const statusOffset = ctx.measureText('STATUS: ').width;
    ctx.shadowColor = 'rgba(0, 230, 118, 0.95)';
    ctx.shadowBlur = 8;
    ctx.font = 'italic 700 24px "Segoe UI", system-ui';
    ctx.fillStyle = greenStyle;
    ctx.fillText(form.status, startX + statusOffset + 4, y);
    ctx.shadowColor = 'rgba(0, 230, 118, 0.45)';
    ctx.shadowBlur = 20;
    ctx.fillText(form.status, startX + statusOffset + 4, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    y = 338;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('ISSUED:', startX, y);
    const issuedOffset = ctx.measureText('ISSUED: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.issuedDate, startX + issuedOffset + 4, y);

    y = 398;
    ctx.font = '500 16px "Segoe UI", system-ui';
    ctx.fillStyle = labelStyle;
    ctx.fillText('ID:', startX, y);
    const idOffset = ctx.measureText('ID: ').width;
    ctx.font = '700 26px "Segoe UI", system-ui';
    ctx.fillStyle = valueStyle;
    ctx.fillText(form.serialId, startX + idOffset + 4, y);

    ctx.restore();
  };

  const drawQRCode = (ctx: CanvasRenderingContext2D) => {
    if (!qrImg) return;
    const qx = 838, qy = 290, qs = 95;

    ctx.save();
    ctx.fillStyle = 'rgba(74, 82, 48, 0.52)';
    ctx.beginPath();
    roundRect(ctx, qx - 12, qy - 12, qs + 24, qs + 60, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(182, 191, 138, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, qx - 12, qy - 12, qs + 24, qs + 60, 8);
    ctx.stroke();

    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qs;
    qrCanvas.height = qs;
    const qrCtx = qrCanvas.getContext('2d')!;
    qrCtx.drawImage(qrImg, 0, 0, qs, qs);
    qrCtx.globalCompositeOperation = 'source-in';
    const qrGrad = qrCtx.createLinearGradient(0, 0, qs, qs);
    qrGrad.addColorStop(0, 'rgba(255, 168, 204, 0.92)');
    qrGrad.addColorStop(0.35, 'rgba(236, 120, 182, 0.9)');
    qrGrad.addColorStop(0.7, 'rgba(222, 106, 168, 0.84)');
    qrGrad.addColorStop(1, 'rgba(198, 82, 150, 0.78)');
    qrCtx.fillStyle = qrGrad;
    qrCtx.fillRect(0, 0, qs, qs);
    qrCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(qrCanvas, qx, qy, qs, qs);

    const qrGlow = ctx.createRadialGradient(qx + qs * 0.35, qy + qs * 0.28, 0, qx + qs * 0.35, qy + qs * 0.28, qs * 0.95);
    qrGlow.addColorStop(0, 'rgba(255, 176, 212, 0.12)');
    qrGlow.addColorStop(0.5, 'rgba(255, 160, 205, 0.05)');
    qrGlow.addColorStop(1, 'rgba(255, 160, 205, 0)');
    ctx.fillStyle = qrGlow;
    ctx.fillRect(qx - 6, qy - 6, qs + 12, qs + 12);

    ctx.font = '600 9px "Segoe UI", system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = QR_COLOR;
    ctx.fillText('TOKEN: ' + form.qrToken, qx + qs / 2, qy + qs + 15);
    ctx.fillStyle = 'rgba(170, 175, 190, 0.55)';
    ctx.font = '500 8px "Segoe UI", system-ui';
    const recordText = 'RECORD: ' + form.qrRecord;
    const words = recordText.split(' ');
    const line1 = words.slice(0, 2).join(' ');
    const line2 = words.slice(2).join(' ');
    ctx.fillText(line1, qx + qs / 2, qy + qs + 28);
    ctx.fillText(line2, qx + qs / 2, qy + qs + 40);
    ctx.restore();
  };

  const drawDescription = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.font = '500 12px "Segoe UI", system-ui';
    ctx.fillStyle = 'rgba(180, 190, 210, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(form.description, CANVAS_W / 2, 510);
    ctx.restore();
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = REAL_W;
    canvas.height = REAL_H;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    drawPanel(ctx);
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawQRCode(ctx);
    drawDescription(ctx);
  }, [bgImg, logoImg, avatarImg, qrImg, form]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = await loadImage(ev.target?.result as string);
      setRawAvatarImg(img);

      const fitScale = (CROP_RADIUS * 2) / Math.min(img.width, img.height);
      setAvatarCrop({
        scale: fitScale,
        x: (EDITOR_SIZE - img.width * fitScale) / 2,
        y: (EDITOR_SIZE - img.height * fitScale) / 2,
        dragging: false,
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
      });
      setShowAvatarEditor(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const drawEditorCanvas = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !rawAvatarImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = EDITOR_SIZE;
    canvas.width = s * DPR;
    canvas.height = s * DPR;
    canvas.style.width = s + 'px';
    canvas.style.height = s + 'px';
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, s, s);

    const w = rawAvatarImg.width * avatarCrop.scale;
    const h = rawAvatarImg.height * avatarCrop.scale;
    ctx.drawImage(rawAvatarImg, avatarCrop.x, avatarCrop.y, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, s, s);
    ctx.arc(s / 2, s / 2, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill('evenodd');
    ctx.restore();

    ctx.beginPath();
    ctx.arc(s / 2, s / 2, CROP_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160, 32, 240, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [rawAvatarImg, avatarCrop]);

  useEffect(() => {
    if (showAvatarEditor) {
      drawEditorCanvas();
    }
  }, [showAvatarEditor, drawEditorCanvas]);

  const onEditorMouseDown = (e: React.MouseEvent) => {
    setAvatarCrop(prev => ({
      ...prev,
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: prev.x,
      origY: prev.y,
    }));
  };

  const onEditorMouseMove = (e: React.MouseEvent) => {
    if (!avatarCrop.dragging) return;
    setAvatarCrop(prev => ({
      ...prev,
      x: prev.origX + (e.clientX - prev.startX),
      y: prev.origY + (e.clientY - prev.startY),
    }));
  };

  const onEditorMouseUp = () => {
    setAvatarCrop(prev => ({ ...prev, dragging: false }));
  };

  const onEditorWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const oldScale = avatarCrop.scale;
    const newScale = Math.max(0.1, Math.min(5, oldScale + delta));

    const cx = EDITOR_SIZE / 2;
    const cy = EDITOR_SIZE / 2;
    setAvatarCrop(prev => ({
      ...prev,
      x: cx - (cx - prev.x) * (newScale / oldScale),
      y: cy - (cy - prev.y) * (newScale / oldScale),
      scale: newScale,
    }));
  };

  const applyAvatar = () => {
    const cropCanvas = document.createElement('canvas');
    const size = CROP_RADIUS * 2 * DPR;
    cropCanvas.width = size;
    cropCanvas.height = size;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    if (!rawAvatarImg) return;
    const w = rawAvatarImg.width * avatarCrop.scale;
    const h = rawAvatarImg.height * avatarCrop.scale;
    const offsetX = avatarCrop.x - (EDITOR_SIZE / 2 - CROP_RADIUS);
    const offsetY = avatarCrop.y - (EDITOR_SIZE / 2 - CROP_RADIUS);

    ctx.beginPath();
    ctx.arc(CROP_RADIUS, CROP_RADIUS, CROP_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(rawAvatarImg, offsetX, offsetY, w, h);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      setAvatarImg(croppedImg);
      setShowAvatarEditor(false);
    };
    croppedImg.src = cropCanvas.toDataURL('image/png');
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const cx = 210, cy = 310, r = 100;
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
      avatarInputRef.current?.click();
    }
  };

  const exportPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = REAL_W;
    canvas.height = REAL_H;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (bgImg) {
      drawCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    }
    drawPanel(ctx);
    drawLogo(ctx);
    drawAvatar(ctx);
    drawDividerLine(ctx);
    drawTextFields(ctx);
    drawDescription(ctx);
    drawQRCode(ctx);

    const link = document.createElement('a');
    link.download = `card-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Card Generator</h1>
            <p className="text-sm text-slate-400">Preview first, edit via modal</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInfoEditor(true)}
              className="px-5 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/20 text-slate-200 rounded-lg font-semibold transition-all"
            >
              Edit Info
            </button>
            <button
              onClick={exportPNG}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30"
            >
              Export HD PNG
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className="max-w-full rounded-xl shadow-2xl cursor-default"
            style={{ maxHeight: 'calc(100vh - 160px)' }}
          />
          <p className="mt-3 text-xs text-slate-500">Click avatar area to upload image</p>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarUpload}
      />

      {showInfoEditor && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowInfoEditor(false)}
        >
          <div className="bg-[#1a1d2e] border border-slate-700/30 rounded-2xl p-6 w-[min(760px,calc(100vw-48px))] max-h-[calc(100vh-48px)] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-100">Edit Info</h2>
              <button
                onClick={() => setShowInfoEditor(false)}
                className="text-3xl text-slate-400 hover:text-slate-200 leading-none w-8 h-8"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">NAME</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-black/70 border border-slate-700/25 rounded-lg text-slate-100 text-sm outline-none focus:border-purple-500/50 transition-all"
                  placeholder="Enter name"
                />
              </div>

              <div className="h-px bg-slate-700/15 my-1" />

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">AVATAR</label>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full px-5 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/20 text-slate-200 rounded-lg font-semibold transition-all"
                >
                  Upload / Change Avatar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                onClick={() => setShowInfoEditor(false)}
                className="px-5 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/20 text-slate-200 rounded-lg font-semibold transition-all"
              >
                Close
              </button>
              <button
                onClick={exportPNG}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30"
              >
                Export HD PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarEditor && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowAvatarEditor(false)}
        >
          <div className="bg-[#1a1d2e] border border-slate-700/30 rounded-2xl p-7 flex flex-col items-center gap-4 min-w-[360px]">
            <h2 className="text-xl font-bold text-slate-100 self-start">Adjust Avatar</h2>
            <p className="text-xs text-slate-400 self-start">Drag to move · Scroll to zoom</p>
            <div className="relative">
              <canvas
                ref={editorCanvasRef}
                onMouseDown={onEditorMouseDown}
                onMouseMove={onEditorMouseMove}
                onMouseUp={onEditorMouseUp}
                onMouseLeave={onEditorMouseUp}
                onWheel={onEditorWheel}
                className="cursor-move"
              />
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowAvatarEditor(false)}
                className="flex-1 px-5 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/20 text-slate-200 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={applyAvatar}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/30"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
