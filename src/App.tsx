import React, { useState, useEffect, useRef } from 'react';

const SIGNALING_SERVER = 'wss://server-vclu.onrender.com';

function App() {
  const [mode, setMode] = useState<'home' | 'controlling'>('home');
  const [code, setCode] = useState('');
  const [screenImage, setScreenImage] = useState<string | null>(null);
  const [status, setStatus] = useState('Đang kết nối...');
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket(SIGNALING_SERVER);
    socketRef.current = socket;
    
    socket.onopen = () => setStatus('Sẵn sàng kết nối');
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'JOIN_SUCCESS') setMode('controlling');
      if (msg.type === 'SCREEN_DATA') setScreenImage(msg.image);
      if (msg.type === 'ERROR') alert(msg.message);
    };
    return () => socket.close();
  }, []);

  const handleStartControl = () => {
    if (!code) return alert('Nhập mã ID!');
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
      <div style={{ position: 'fixed', inset: 0, background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#2d2d2d', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444' }}>
          <div style={{ color: '#00ff00', fontSize: '12px', fontWeight: 'bold' }}>● ULTRAVIEW WEB - ĐANG ĐIỀU KHIỂN</div>
          <button onClick={() => window.location.reload()} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Ngắt kết nối</button>
        </div>
        <div 
          ref={containerRef}
          onMouseMove={(e) => sendInput('mousemove', e)}
          onClick={(e) => sendInput('click', e)}
          style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', overflow: 'hidden' }}
        >
          {screenImage ? (
            <img src={screenImage} alt="Remote Screen" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} />
          ) : (
            <div style={{ color: '#888' }}>Đang đợi hình ảnh từ máy tính...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '400px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: '#0056b3', color: 'white', padding: '15px', fontSize: '18px', fontWeight: 'bold' }}>UltraView Web Controller</div>
        <div style={{ padding: '30px' }}>
          <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>Nhập ID của đối tác để điều khiển:</p>
          <input 
            type="text" placeholder="ID Đối tác (Ví dụ: XSZZCB)" value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', fontSize: '18px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', outline: 'none' }}
          />
          <button onClick={handleStartControl} style={{ width: '100%', background: '#28a745', color: 'white', padding: '12px', borderRadius: '4px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Bắt đầu điều khiển
          </button>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}>Trạng thái: {status}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
