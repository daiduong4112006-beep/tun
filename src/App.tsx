import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Terminal, 
  Settings, 
  Folder, 
  Chrome, 
  X, 
  Minus, 
  Square, 
  MousePointer2, 
  Keyboard,
  Power,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type AppWindow = {
  id: string;
  title: string;
  icon: any;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
};

type RemoteEvent = {
  type: 'click' | 'move' | 'type';
  x?: number;
  y?: number;
  key?: string;
  targetId?: string;
};

// --- Constants ---

const INITIAL_APPS: AppWindow[] = [
  { 
    id: 'browser', 
    title: 'Web Browser', 
    icon: Chrome, 
    isOpen: false, 
    isMinimized: false, 
    zIndex: 1, 
    x: 100, 
    y: 100, 
    width: 600, 
    height: 400,
    content: 'https://www.google.com/search?q=remote+desktop+simulation'
  },
  { 
    id: 'files', 
    title: 'File Explorer', 
    icon: Folder, 
    isOpen: false, 
    isMinimized: false, 
    zIndex: 1, 
    x: 150, 
    y: 150, 
    width: 500, 
    height: 350,
    content: 'Documents, Downloads, Images...'
  },
  { 
    id: 'terminal', 
    title: 'Terminal', 
    icon: Terminal, 
    isOpen: false, 
    isMinimized: false, 
    zIndex: 1, 
    x: 200, 
    y: 200, 
    width: 550, 
    height: 300,
    content: 'user@remote:~$ _'
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    icon: Settings, 
    isOpen: false, 
    isMinimized: false, 
    zIndex: 1, 
    x: 250, 
    y: 250, 
    width: 400, 
    height: 450,
    content: 'System Preferences'
  },
];

// --- Components ---

export default function App() {
  const [mode, setMode] = useState<'selection' | 'host' | 'client'>('selection');
  const [sessionCode, setSessionCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [remoteCursor, setRemoteCursor] = useState<{ x: number, y: number } | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'SESSION_CREATED') {
        setSessionCode(data.code);
      } else if (data.type === 'JOIN_SUCCESS') {
        setIsConnected(true);
        setMode('client');
        initWebRTCClient();
      } else if (data.type === 'JOIN_ERROR') {
        setError(data.message);
      } else if (data.type === 'CLIENT_CONNECTED') {
        setIsConnected(true);
        initWebRTCHost();
      } else if (data.type === 'SIGNAL') {
        handleSignal(data.data);
      } else if (data.type === 'HOST_DISCONNECTED') {
        setError('Host disconnected');
        setIsConnected(false);
        setMode('selection');
        cleanupWebRTC();
      } else if (data.type === 'REMOTE_CURSOR') {
        setRemoteCursor({ x: data.x, y: data.y });
      }
    };

    return () => {
      socket.close();
      cleanupWebRTC();
    };
  }, []);

  // --- WebRTC Logic ---

  const cleanupWebRTC = () => {
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current = null;
    localStreamRef.current = null;
  };

  const initWebRTCHost = async () => {
    try {
      // Capture Real Screen
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.send(JSON.stringify({ type: 'SIGNAL', data: { candidate: e.candidate } }));
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({ type: 'SIGNAL', data: { sdp: pc.localDescription } }));
    } catch (err) {
      console.error("Screen share failed:", err);
      setError("Không thể chia sẻ màn hình. Hãy cấp quyền trình duyệt.");
    }
  };

  const initWebRTCClient = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.send(JSON.stringify({ type: 'SIGNAL', data: { candidate: e.candidate } }));
      }
    };

    pc.ontrack = (e) => {
      const video = document.getElementById('remote-video') as HTMLVideoElement;
      if (video) video.srcObject = e.streams[0];
    };
  };

  const handleSignal = async (data: any) => {
    const pc = peerRef.current;
    if (!pc) return;

    if (data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.send(JSON.stringify({ type: 'SIGNAL', data: { sdp: pc.localDescription } }));
      }
    } else if (data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  // --- UI Handlers ---

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isConnected && socketRef.current) {
      socketRef.current.send(JSON.stringify({ 
        type: 'CURSOR_MOVE', 
        x: e.clientX / window.innerWidth, 
        y: e.clientY / window.innerHeight 
      }));
    }
  };

  const createSession = () => {
    socketRef.current?.send(JSON.stringify({ type: 'CREATE_SESSION' }));
    setMode('host');
  };

  const joinSession = () => {
    if (!inputCode) return;
    socketRef.current?.send(JSON.stringify({ type: 'JOIN_SESSION', code: inputCode.toUpperCase() }));
  };

  if (mode === 'selection') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Host Side (The "App") */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-emerald-600/20 text-emerald-500 rounded-2xl">
              <Smartphone size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Cài đặt Agent</h2>
              <p className="text-zinc-400 text-sm">Cài đặt ứng dụng này trên máy tính bạn muốn được điều khiển.</p>
            </div>
            <button 
              onClick={createSession}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <Power size={20} />
              Bắt đầu Chia sẻ Thật
            </button>
            <div className="text-xs text-zinc-600 flex items-center gap-2">
              <Check size={12} /> Sử dụng WebRTC & Screen Capture
            </div>
          </div>

          {/* Client Side (The "Web") */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-blue-600/20 text-blue-500 rounded-2xl">
              <Monitor size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Web Controller</h2>
              <p className="text-zinc-400 text-sm">Truy cập từ bất kỳ trình duyệt nào để điều khiển máy tính của bạn.</p>
            </div>
            <div className="w-full space-y-3">
              <input 
                type="text" 
                placeholder="NHẬP MÃ KẾT NỐI"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                onClick={joinSession}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Bắt đầu điều khiển
              </button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </motion.div>
        
        <div className="mt-12 text-zinc-500 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Hệ thống RemoteDesk Pro (WebRTC) đang trực tuyến
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black" onMouseMove={handleMouseMove}>
      {mode === 'host' ? (
        <HostView 
          sessionCode={sessionCode} 
          isConnected={isConnected} 
          socket={socketRef.current} 
          onBack={() => { cleanupWebRTC(); setMode('selection'); }}
          remoteCursor={remoteCursor}
        />
      ) : (
        <ClientView 
          socket={socketRef.current} 
          onBack={() => { cleanupWebRTC(); setMode('selection'); }}
          remoteCursor={remoteCursor}
        />
      )}
    </div>
  );
}

// --- Host View ---

function HostView({ sessionCode, isConnected, socket, onBack, remoteCursor }: { sessionCode: string, isConnected: boolean, socket: WebSocket | null, onBack: () => void, remoteCursor: { x: number, y: number } | null }) {
  const [copied, setCopied] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 12, ram: 45, network: 1.2 });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: 45 + Math.random() * 2,
        network: parseFloat((Math.random() * 2 + 0.5).toFixed(1))
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full bg-[#050505] flex items-center justify-center p-6 font-mono">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* App Header */}
        <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-zinc-300">RemoteDesk Agent v2.0 (Real)</span>
          </div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* App Content */}
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'} transition-all`} />
            <h3 className="text-lg font-bold text-white">
              {isConnected ? 'Đang truyền màn hình thật' : 'Sẵn sàng kết nối'}
            </h3>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">
              {isConnected ? 'Session ID: ' + sessionCode : 'Chờ người điều khiển...'}
            </p>
          </div>

          {!isConnected && (
            <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 text-center space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase">Mã truy cập của bạn</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold text-blue-400 tracking-tighter">{sessionCode || '------'}</span>
                <button onClick={copyCode} className="text-zinc-500 hover:text-white transition-colors">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* System Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
              <p className="text-[9px] text-zinc-500 uppercase mb-1">CPU</p>
              <p className="text-sm font-bold text-zinc-300">{systemStats.cpu}%</p>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
              <p className="text-[9px] text-zinc-500 uppercase mb-1">RAM</p>
              <p className="text-sm font-bold text-zinc-300">{systemStats.ram.toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
              <p className="text-[9px] text-zinc-500 uppercase mb-1">Net</p>
              <p className="text-sm font-bold text-zinc-300">{systemStats.network} MB/s</p>
            </div>
          </div>

          {isConnected && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                <MousePointer2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-400">Điều khiển từ xa đang bật</p>
                <p className="text-[10px] text-blue-400/60">Màn hình thật của bạn đang được chia sẻ.</p>
              </div>
            </div>
          )}

          <button 
            onClick={onBack}
            className="w-full py-3 bg-zinc-800 hover:bg-red-900/20 hover:text-red-500 rounded-xl text-xs font-bold transition-all border border-zinc-700"
          >
            Dừng Agent & Ngắt kết nối
          </button>
        </div>

        {/* Footer */}
        <div className="bg-black/30 px-4 py-2 text-[9px] text-zinc-600 flex justify-between">
          <span>IP: 192.168.1.42</span>
          <span>WebRTC: Connected</span>
        </div>
      </motion.div>
    </div>
  );
}

// --- Client View ---

function ClientView({ socket, onBack, remoteCursor }: { socket: WebSocket | null, onBack: () => void, remoteCursor: { x: number, y: number } | null }) {
  const [isReady, setIsReady] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = document.getElementById('remote-video') as HTMLVideoElement;
    if (video) {
      video.onloadedmetadata = () => setIsReady(true);
    }
  }, []);

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden relative">
      {/* Control Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            exit={{ y: -50 }}
            className="absolute top-0 left-0 right-0 h-12 bg-zinc-900/90 backdrop-blur-md border-b border-white/10 z-[1000] flex items-center justify-between px-4"
          >
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                <ArrowLeft size={16} /> Ngắt kết nối
              </button>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                <Smartphone size={14} /> ĐANG ĐIỀU KHIỂN MÀN HÌNH THẬT
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><Keyboard size={18} /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><MousePointer2 size={18} /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400"><Settings size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Content Container */}
      <div className="flex-1 relative bg-[#111] flex items-center justify-center">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 z-10 bg-black">
            <RefreshCw className="animate-spin text-blue-500" size={32} />
            <p className="text-zinc-500 animate-pulse">Đang nhận luồng video WebRTC...</p>
          </div>
        )}
        
        <div className="relative w-full h-full flex items-center justify-center">
          <video 
            id="remote-video" 
            autoPlay 
            playsInline 
            className="max-w-full max-h-full shadow-2xl cursor-crosshair"
          />
          
          {/* Remote Cursor Indicator */}
          {remoteCursor && (
            <motion.div 
              animate={{ x: remoteCursor.x * 100 + '%', y: remoteCursor.y * 100 + '%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="absolute w-4 h-4 text-zinc-400 pointer-events-none z-[1000]"
            >
              <MousePointer2 size={16} fill="currentColor" />
              <div className="ml-4 mt-1 bg-zinc-800 text-[8px] px-1 rounded text-white whitespace-nowrap">Host Cursor</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Toggle */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="absolute bottom-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 transition-colors z-[2000]"
      >
        <Settings size={20} />
      </button>
    </div>
  );
}
