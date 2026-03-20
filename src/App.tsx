import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, User, Cpu, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
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

  const handleNextToGenerator = () => {
    if (!imagePreview || !characterName.trim()) return;

    // SAVE EVERYTHING: Image, Name, and the Crop Data
    localStorage.setItem('vid_uploaded_avatar', imagePreview);
    localStorage.setItem('vid_character_name', characterName);
    localStorage.setItem('vid_avatar_scale', imageScale.toString());
    localStorage.setItem('vid_avatar_x', imagePosition.x.toString());
    localStorage.setItem('vid_avatar_y', imagePosition.y.toString());
    
    navigate('/card-generator');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter'] selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            V-ID IDENTITY MINT
          </h1>
          <p className="text-gray-400 text-lg">Initialize your virtual presence in the network.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Configuration */}
          <div className="space-y-8">
            <div className="bg-[#111] border border-white/5 p-8 rounded-2xl">
              <label className="block text-sm font-medium text-blue-400 mb-4 tracking-widest uppercase">01. Character Name</label>
              <input 
                type="text" 
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Enter Identity Designation..."
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 outline-none transition-all font-mono"
              />
            </div>

            <div className="bg-[#111] border border-white/5 p-8 rounded-2xl">
              <label className="block text-sm font-medium text-blue-400 mb-4 tracking-widest uppercase">02. Avatar Upload & Adjust</label>
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                  <Upload className="w-12 h-12 text-gray-500 mb-4" />
                  <span className="text-gray-400 font-mono text-sm">DROP OR SELECT DATA SOURCE</span>
                  <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
              ) : (
                <div className="space-y-6">
                  <div 
                    className="relative w-80 h-80 mx-auto overflow-hidden rounded-full border-2 border-blue-500/50 cursor-move bg-black"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      draggable="false"
                      style={{
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                      className="max-w-none w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-gray-500 uppercase">
                      <span>Zoom Level</span>
                      <span>{Math.round(imageScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="3" step="0.01" 
                      value={imageScale} 
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <button onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:text-red-300 transition-colors uppercase font-mono tracking-widest">
                    Clear Data Source
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action */}
          <div className="lg:sticky lg:top-20 space-y-6">
            <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-2xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" /> SYSTEM STATUS
              </h3>
              <ul className="space-y-4 text-sm font-mono text-gray-400">
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>ENCRYPTION:</span> <span className="text-green-500">SHA-256 ENABLED</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>METADATA:</span> <span className="text-blue-400">V-ID VER 2.1</span>
                </li>
                <li className="flex justify-between">
                  <span>DESIGNATION:</span> <span className={characterName ? 'text-white' : 'text-red-900'}>{characterName || 'PENDING'}</span>
                </li>
              </ul>
              <button 
                onClick={handleNextToGenerator}
                disabled={!imagePreview || !characterName}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
              >
                PROCEED TO GENERATOR <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;