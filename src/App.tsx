import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleNextToGenerator = () => {
    if (!imagePreview || !characterName.trim()) return;
    localStorage.setItem('vid_uploaded_avatar', imagePreview);
    localStorage.setItem('vid_character_name', characterName);
    localStorage.setItem('vid_avatar_scale', imageScale.toString());
    localStorage.setItem('vid_avatar_x', imagePosition.x.toString());
    localStorage.setItem('vid_avatar_y', imagePosition.y.toString());
    navigate('/card-generator');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>V-ID IDENTITY MINT</h1>
        
        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #222' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#3b82f6' }}>01. 输入名称</label>
          <input 
            type="text" 
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'black', border: '1px solid #333', color: 'white', borderRadius: '8px' }}
          />
        </div>

        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #222' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#3b82f6' }}>02. 上传并调整图片</label>
          {!imagePreview ? (
            <input type="file" onChange={handleImageUpload} accept="image/*" />
          ) : (
            <div>
              <div 
                onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y }); }}
                onMouseMove={(e) => { if (isDragging) setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                style={{ width: '300px', height: '300px', margin: '20px auto', borderRadius: '50%', border: '2px solid #3b82f6', overflow: 'hidden', cursor: 'move', backgroundColor: 'black', position: 'relative' }}
              >
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  draggable="false"
                  style={{
                    position: 'absolute',
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                    maxWidth: 'none', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none'
                  }}
                />
              </div>
              <input 
                type="range" min="0.5" max="3" step="0.01" value={imageScale} 
                onChange={(e) => setImageScale(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <button 
          onClick={handleNextToGenerator}
          disabled={!imagePreview || !characterName}
          style={{ width: '100%', marginTop: '30px', padding: '15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', opacity: (!imagePreview || !characterName) ? 0.5 : 1 }}
        >
          生成身份卡
        </button>
      </div>
    </div>
  );
}

export default App;