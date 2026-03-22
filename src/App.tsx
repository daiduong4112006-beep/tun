import React, { useState, useEffect, useRef } from 'react';

// ĐỊA CHỈ MÁY CHỦ
const SIGNALING_SERVER = 'wss://server-vclu.onrender.com';

function App() {
  const [mode, setMode] = useState<'home' | 'controlling'>('home');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('Đang khởi động...');
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Kết nối tới Signaling Server
  useEffect(() => {
    const connectSocket = () => {
      try {
        const socket = new WebSocket(SIGNALING_SERVER);
        socketRef.current = socket;

        socket.onopen = () => setStatus('Đã kết nối máy chủ ✅');
        socket.onclose = () => {
          setStatus('Mất kết nối máy chủ ❌');
          setTimeout(connectSocket, 3000); // Tự động kết nối lại
        };
        
        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'JOIN_SUCCESS') {
              setIsConnecting(false);
              setMode('controlling');
              setStatus('Đang điều khiển... 🎮');
            }
            if (msg.type === 'ERROR') {
              alert('Lỗi: ' + msg.message);
              setIsConnecting(false);
            }
          } catch (e) {
            console.error("Lỗi xử lý tin nhắn:", e);
          }
        };

        socket.onerror = (err) => {
          console.error("Lỗi WebSocket:", err);
          setStatus('Lỗi kết nối máy chủ ⚠️');
        };
      } catch (err) {
        console.error("Không thể tạo WebSocket:", err);
      }
    };

    connectSocket();
    return () => socketRef.current?.close();
  }, []);

  const handleStartControl = () => {
    if (!code || code.length < 4) {
      alert('Vui lòng nhập mã kết nối từ Agent!');
      return;
    }
    setIsConnecting(true);
    setStatus('Đang tìm máy tính... 🔍');
    
    socketRef.current?.send(JSON.stringify({
      type: 'JOIN_SESSION',
      code: code.toUpperCase()
    }));
  };

  const sendInput = (type: string, e: React.MouseEvent) => {
    if (mode !== 'controlling' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    socketRef.current?.send(JSON.stringify({
      type: 'REMOTE_INPUT',
      event: { type, x, y }
    }));
  };

  // GIAO DIỆN KHI ĐANG ĐIỀU KHIỂN
  if (mode === 'controlling') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'black', display: 'flex', flexDirection: 'column', color: 'white' }}>
        <div style={{ background: '#18181b', padding: '10px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #3f3f46' }}>
          <div style={{ color: '#10b981', fontSize: '14px' }}>🟢 ĐANG ĐIỀU KHIỂN MÁY TÍNH</div>
          <button onClick={() => window.location.reload()} style={{ color: '#71717a', background: 'none', border: 'none', cursor: 'pointer' }}>✖ Đóng</button>
        </div>
        
        <div 
          ref={containerRef}
          onMouseMove={(e) => sendInput('mousemove', e)}
          onClick={(e) => sendInput('click', e)}
          style={{ flex: 1, background: '#27272a', margin: '20px', borderRadius: '10px', border: '2px dashed #52525b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', overflow: 'hidden' }}
        >
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '50px' }}>🖥️</div>
            <p>DI CHUỘT VÀ CLICK VÀO ĐÂY</p>
            <p style={{ fontSize: '12px' }}>Lệnh sẽ được gửi tới máy tính thật</p>
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN TRANG CHỦ
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px', background: '#18181b', borderRadius: '20px', border: '1px solid #27272a', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🌐</div>
        <h2 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>RemoteDesk Web</h2>
        <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '20px' }}>Nhập mã từ ứng dụng Agent để bắt đầu</p>
        
        <input 
          type="text" 
          placeholder="MÃ KẾT NỐI"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ width: '100%', boxSizing: 'border-box', background: 'black', border: '1px solid #3f3f46', borderRadius: '10px', padding: '15px', color: 'white', textAlign: 'center', fontSize: '20px', letterSpacing: '5px', marginBottom: '15px', outline: 'none' }}
        />

        <button 
          onClick={handleStartControl}
          disabled={isConnecting}
          style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '15px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: isConnecting ? 0.5 : 1 }}
        >
          {isConnecting ? 'ĐANG KẾT NỐI...' : 'BẮT ĐẦU ĐIỀU KHIỂN'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#71717a' }}>
          Trạng thái: {status}
        </div>
      </div>
    </div>
  );
}

export default App;
