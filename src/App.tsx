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
      if (msg.type === 'JOIN_SUCCESS') {
        setMode('controlling');
        // Gửi lệnh yêu cầu Agent bắt đầu gửi màn hình
        socketRef.current?.send(JSON.stringify({ type: 'START_STREAM' }));
      }
      if (msg.type === 'SCREEN_DATA') {
        setScreenImage(msg.image);
      }
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
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#222', padding: '10px', color: '#0f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>● ULTRAVIEW WEB - LIVE SCREEN</span>
          <button onClick={() => window.location.reload()} style={{ background: 'red', color: 'white', border: 'none', padding: '2px 10px', cursor: 'pointer' }}>Thoát</button>
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
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
            />
          ) : (
            <div style={{ color: '#555' }}>Đang đợi hình ảnh từ máy tính...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
      <div style={{ width: '350px', background: 'white', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ background: '#0056b3', color: 'white', padding: '20px', fontWeight: 'bold' }}>UltraView Web</div>
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <input 
            type="text" placeholder="Nhập ID máy tính" value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ width: '100%', boxSizing: 'border-box', padding: '15px', fontSize: '20px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' }}
          />
          <button onClick={handleStartControl} style={{ width: '100%', background: '#28a745', color: 'white', padding: '15px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            Bắt đầu điều khiển
          </button>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>{status}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
