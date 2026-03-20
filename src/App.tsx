import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Upload, Shield, ArrowRight } from 'lucide-react';
import CardGenerator from './components/CardGenerator';

// 这是你的首页组件
function HomePage() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imagePreview) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleNext = () => {
    if (!imagePreview || !characterName) return;
    localStorage.setItem('vid_uploaded_avatar', imagePreview);
    localStorage.setItem('vid_character_name', characterName);
    localStorage.setItem('vid_avatar_scale', imageScale.toString());
    localStorage.setItem('vid_avatar_x', imagePosition.x.toString());
    localStorage.setItem('vid_avatar_y', imagePosition.y.toString());
    navigate('/card-generator');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10 tracking-tighter">V-ID IDENTITY MINT</h1>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="bg-[#111] p-6 rounded-2xl border border-white/5">
              <label className="block text-blue-400 text-xs mb-2 tracking-widest">01. NAME</label>
              <input 
                type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)}
                className="w-full bg-black border border-white/10 p-3 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Name..."
              />
            </div>
            <div className="bg-[#111] p-6 rounded-2xl border border-white/5">
              <label className="block text-blue-400 text-xs mb-4 tracking-widest">02. AVATAR</label>
              {!imagePreview ? (
                <input type="file" onChange={handleImageUpload} className="text-sm" />
              ) : (
                <div className="space-y-4">
                  <div 
                    className="w-64 h-64 mx-auto rounded-full border-2 border-blue-500 overflow-hidden cursor-move relative bg-black"
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                  >
                    <img 
                      src={imagePreview} alt="p" draggable="false"
                      style={{ transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`, position: 'absolute', width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <input type="range" min="0.5" max="3" step="0.01" value={imageScale} onChange={(e) => setImageScale(parseFloat(e.target.value))} className="w-full" />
                </div>
              )}
            </div>
          </div>
          <div className="bg-blue-600/10 border border-blue-600/20 p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <Shield className="mb-4 text-blue-500" />
              <h3 className="font-bold text-xl mb-2">SYSTEM STATUS</h3>
              <p className="text-gray-400 text-sm">Waiting for identity parameters...</p>
            </div>
            <button 
              onClick={handleNext} disabled={!imagePreview || !characterName}
              className="w-full bg-blue-600 py-4 rounded-xl font-bold mt-10 hover:bg-blue-500 disabled:opacity-30"
            >
              PROCEED TO GENERATOR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 核心：这是整个 App 的容器，如果删了它，预览就会变白
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/card-generator" element={<CardGenerator />} />
    </Routes>
  );
}