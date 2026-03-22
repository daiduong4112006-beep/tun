import React, { useState, useEffect, useRef } from 'react';

const SIGNALING_SERVER = 'wss://server-vclu.onrender.com';

function App() {
  const [mode, setMode] = useState<'home' | 'controlling'>('home');
  const [code, setCode] = useState('');
  const [screenImage, setScreenImage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket(SIGNALING_SERVER);
    socketRef.current = socket;
    
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'JOIN_SUCCESS') setMode('controlling');
      if (msg.type === 'SCREEN_DATA') {
        setScreenImage(msg.image); // Cập nhật hình ảnh màn hình nhận được
      }
    };
    return () => socket.close();
  }, []);

  const handleStartControl = () => {
    socketRef.current?.send(JSON.stringify({ type: 'JOIN_SESSION', code: code.toUpperCase() }));
  };

  const sendInput = (type: string, e: React.MouseEvent) => {
    if (mode !== 'controlling' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    socketRef.current?.send(JSON.stringify({ type: 'REMOTE_INPUT', event: { type, x, y } }));
  };

  if (mode === 'controlling') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'black', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#18181b', padding: '10px', color: '#10b981', fontSize: '12px', borderBottom: '1px solid #333' }}>
          🟢 ĐANG XEM MÀN HÌNH MÁY TÍNH THẬT
        </div>
        <div 
          ref={containerRef}
          onMouseMove={(e) => sendInput('mousemove', e)}
          onClick={(e) => sendInput('click', e)}
          style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair' }}
        >
          {screenImage ? (
            <img 
              src={screenImage} 
              alt="Screen" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
            />
          ) : (
            <div style={{ color: 'white' }}>Đang tải màn hình...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '350px', padding: '30px', background: '#18181b', borderRadius: '20px', textAlign: 'center' }}>
        <h2>RemoteDesk</h2>
        <input 
          type="text" placeholder="MÃ KẾT NỐI" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ width: '100%', background: 'black', border: '1px solid #333', padding: '15px', color: 'white', fontSize: '20px', textAlign: 'center', marginBottom: '15px' }}
        />
        <button onClick={handleStartControl} style={{ width: '100%', background: '#2563eb', color: 'white', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          KẾT NỐI NGAY
        </button>
      </div>
    </div>
  );
}

export default App;
