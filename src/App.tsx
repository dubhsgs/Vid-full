import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Shield, ArrowRight } from 'lucide-react';

function App() {
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

  const handleNextToGenerator = () => {
    if (!imagePreview || !characterName.trim()) return;

    // 关键步骤：保存所有裁剪和缩放数据到本地
    localStorage.setItem('vid_uploaded_avatar', imagePreview);
    localStorage.setItem('vid_character_name', characterName);
    localStorage.setItem('vid_avatar_scale', imageScale.toString());
    localStorage.setItem('vid_avatar_x', imagePosition.x.toString());
    localStorage.setItem('vid_avatar_y', imagePosition.y.toString());
    
    navigate('/card-generator');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter']">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            V-ID IDENTITY MINT
          </h1>
          <p className="text-gray-400 text-lg">初始化你的网络虚拟身份</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            {/* 01. 角色名输入 */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-2xl">
              <label className="block text-sm font-medium text-blue-400 mb-4 tracking-widest uppercase">01. 身份编号/名称</label>
              <input 
                type="text" 
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="输入你的虚拟身份名称..."
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 outline-none transition-all font-mono"
              />
            </div>

            {/* 02. 头像调整区 */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-2xl">
              <label className="block text-sm font-medium text-blue-400 mb-4 tracking-widest uppercase">02. 上传并调整头像</label>
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                  <Upload className="w-12 h-12 text-gray-500 mb-4" />
                  <span className="text-gray-400 font-mono text-sm">点击或拖拽上传图像</span>
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
                      <span>缩放级别</span>
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
                    重置图像
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：状态展示 */}
          <div className="lg:sticky lg:top-20 space-y-6">
            <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-2xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" /> 系统状态
              </h3>
              <ul className="space-y-4 text-sm font-mono text-gray-400">
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>加密协议:</span> <span className="text-green-500">SHA-256 已开启</span>
                </li>
                <li className="flex justify-between border-b border-white/5 pb-2">
                  <span>元数据版本:</span> <span className="text-blue-400">V-ID VER 2.1</span>
                </li>
                <li className="flex justify-between">
                  <span>身份指定:</span> <span className={characterName ? 'text-white' : 'text-red-900'}>{characterName || '等待输入...'}</span>
                </li>
              </ul>
              <button 
                onClick={handleNextToGenerator}
                disabled={!imagePreview || !characterName}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
              >
                生成身份卡 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;