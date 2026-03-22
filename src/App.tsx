import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Play, Loader2, X } from 'lucide-react';

// ĐỊA CHỈ MÁY CHỦ PHẢI KHỚP VỚI AGENT
const SIGNALING_SERVER = 'wss://server-vclu.onrender.com';

function App() {
  const [mode, setMode] = useState<'home' | 'controlling'>('home');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Kết nối tới Signaling Server khi mở Web
  useEffect(() => {
    const socket = new WebSocket(SIGNALING_SERVER);
    socketRef.current = socket;

    socket.onopen = () => setStatus('Đã kết nối máy chủ');
    socket.onclose = () => setStatus('Mất kết nối máy chủ');
    
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'JOIN_SUCCESS') {
        setIsConnecting(false);
        setMode('controlling');
        setStatus('Đang điều khiển...');
      }
      if (msg.type === 'ERROR') {
        alert('Lỗi: ' + msg.message);
        setIsConnecting(false);
      }
    };

    return () => socket.close();
  }, []);

  const handleStartControl = () => {
    if (!code || code.length < 4) {
      alert('Vui lòng nhập mã kết nối chính xác!');
      return;
    }
    setIsConnecting(true);
    setStatus('Đang tìm máy tính...');
    
    // Gửi lệnh kết nối tới Agent qua Server
    socketRef.current?.send(JSON.stringify({
      type: 'JOIN_SESSION',
      code: code.toUpperCase()
    }));
  };

  // Gửi tọa độ chuột khi di chuyển trên vùng điều khiển
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode !== 'controlling' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    socketRef.current?.send(JSON.stringify({
      type: 'REMOTE_INPUT',
      event: { type: 'mousemove', x, y }
    }));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'controlling' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    socketRef.current?.send(JSON.stringify({
      type: 'REMOTE_INPUT',
      event: { type: 'click', x, y }
    }));
  };

  if (mode === 'controlling') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        <div className="bg-zinc-900 p-2 flex justify-between items-center border-b border-white/10">
          <div className="text-emerald-400 text-sm font-mono flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            LIVE: ĐANG ĐIỀU KHIỂN MÁY TÍNH
          </div>
          <button onClick={() => window.location.reload()} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        {/* Vùng điều khiển - Giả lập màn hình */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="flex-1 bg-zinc-800 m-4 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-crosshair relative overflow-hidden"
        >
          <div className="text-white/20 text-center pointer-events-none">
            <Monitor size={64} className="mx-auto mb-4" />
            <p>DI CHUỘT VÀ CLICK VÀO ĐÂY ĐỂ ĐIỀU KHIỂN</p>
            <p className="text-xs mt-2">(Màn hình thật sẽ hiển thị khi bạn cấu hình WebRTC xong)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        
        {/* Cột trái: Agent (Dành cho máy bị điều khiển) */}
        <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-3xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
            <Smartphone className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Cài đặt Đại lý</h2>
          <p className="text-zinc-400 text-sm mb-8">Chạy ứng dụng Agent trên máy tính bạn muốn điều khiển để lấy mã.</p>
          <div className="mt-auto text-xs text-zinc-500 italic">
            Trạng thái: {status}
          </div>
        </div>

        {/* Cột phải: Controller (Dành cho máy điều khiển) */}
        <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-3xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
            <Monitor className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Bộ điều khiển web</h2>
          <p className="text-zinc-400 text-sm mb-8">Nhập mã từ Agent để bắt đầu kết nối.</p>
          
          <input 
            type="text" 
            placeholder="NHẬP MÃ KẾT NỐI"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-black border border-white/20 rounded-xl p-4 text-center text-xl font-mono tracking-[0.5em] mb-4 focus:border-blue-500 outline-none transition-all"
          />

          <button 
            onClick={handleStartControl}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/20"
          >
            {isConnecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play size={20} />
            )}
            {isConnecting ? 'ĐANG KẾT NỐI...' : 'Bắt đầu điều khiển'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
