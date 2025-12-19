import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Settings, Play, Download, Trash2, Plus, Volume2, MessageSquare, User, FileText, Loader2, Info, Sparkles, HeartPulse, Mic2, Wifi, WifiOff, ShieldCheck, Zap, BarChart3, Headphones, BrainCircuit, Wind, Hash, Infinity, Globe, Users, ToggleLeft, ToggleRight, BookOpen, Palette, Check, Lock, Unlock, KeyRound, X, AlertTriangle, Fingerprint, MapPin, Cpu, ShieldAlert, Menu, HelpCircle, CheckCircle2, XCircle, Terminal, Clock, Skull } from 'lucide-react';
import { AppMode, Speaker, DialogueLine, VoiceProfile, Gender, Region, Age, Pitch, Intonation, BaseVoice, Theme } from './types';
import { generateSpeech, generateDialogue, decodeBase64Audio, createWavBlob, refineText } from './services/tts';

const GENDERS: Gender[] = ['Nam', 'Nữ'];
const REGIONS: Region[] = ['Miền Bắc (Hà Nội)', 'Miền Trung (Huế/Đà Nẵng)', 'Miền Nam (Sài Gòn)', 'Chuẩn (Trung lập)'];
const AGES: Age[] = ['Trẻ em', 'Thanh niên', 'Trung niên', 'Người già'];
const PITCHES: Pitch[] = ['Trầm', 'Trung bình', 'Cao'];
const INTONATIONS: Intonation[] = ['Tự nhiên', 'Vui vẻ', 'Trầm buồn', 'Trang trọng', 'Kịch tính', 'Hào hứng'];
const BASE_VOICES: BaseVoice[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Leda', 'Aoede'];

const DEFAULT_PROFILE: VoiceProfile = {
  gender: 'Nam',
  region: 'Miền Bắc (Hà Nội)',
  age: 'Thanh niên',
  pitch: 'Trung bình',
  intonation: 'Tự nhiên',
  baseVoice: 'Kore'
};

const DAILY_LIMIT = 500000; // 500k characters total
const HUMAN_DAILY_LIMIT = 20000; // 20k characters for Human 99% mode

// Obfuscated Password (141020 in Base64) to prevent casual source peeking
const _SEC_KEY = "MTQxMDIw"; 
const VN_FLAG_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/2000px-Flag_of_Vietnam.svg.png";
const VN_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Flag_map_of_Vietnam.svg/634px-Flag_map_of_Vietnam.svg.png";

// === QUIZ DATA ===
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

const QUESTION_POOL: QuizQuestion[] = [
  { id: 1, question: "Quần đảo Hoàng Sa và Trường Sa thuộc chủ quyền của quốc gia nào?", options: ["Việt Nam", "Trung Quốc", "Philippines", "Malaysia"], correctAnswer: "Việt Nam" },
  { id: 2, question: "Ngày Quốc khánh nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là ngày nào?", options: ["30/4", "1/5", "2/9", "19/5"], correctAnswer: "2/9" },
  { id: 3, question: "Vị tướng nào đã chỉ huy chiến thắng Điện Biên Phủ năm 1954?", options: ["Võ Nguyên Giáp", "Văn Tiến Dũng", "Trần Hưng Đạo", "Nguyễn Huệ"], correctAnswer: "Võ Nguyên Giáp" },
  { id: 4, question: "Thủ đô của Việt Nam là gì?", options: ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Huế"], correctAnswer: "Hà Nội" },
  { id: 5, question: "Bác Hồ đọc Tuyên ngôn Độc lập tại đâu?", options: ["Quảng trường Ba Đình", "Bến Nhà Rồng", "Dinh Độc Lập", "Hồ Gươm"], correctAnswer: "Quảng trường Ba Đình" },
  { id: 6, question: "Chiến thắng lịch sử ngày 30/4/1975 giải phóng thành phố nào?", options: ["Hà Nội", "Đà Nẵng", "Sài Gòn", "Hải Phòng"], correctAnswer: "Sài Gòn" },
  { id: 7, question: "Ngô Quyền đánh tan quân Nam Hán trên sông nào năm 938?", options: ["Sông Hồng", "Sông Hương", "Sông Bạch Đằng", "Sông Cửu Long"], correctAnswer: "Sông Bạch Đằng" },
  { id: 8, question: "Tên nước Việt Nam thời vua Hùng là gì?", options: ["Đại Cồ Việt", "Văn Lang", "Âu Lạc", "Đại Việt"], correctAnswer: "Văn Lang" },
  { id: 9, question: "Hai Bà Trưng khởi nghĩa chống lại quân xâm lược nào?", options: ["Quân Nguyên Mông", "Quân Thanh", "Quân Đông Hán", "Quân Minh"], correctAnswer: "Quân Đông Hán" },
  { id: 10, question: "Đỉnh núi cao nhất Việt Nam (Nóc nhà Đông Dương) tên là gì?", options: ["Langbiang", "Bà Đen", "Fansipan", "Pu Si Lung"], correctAnswer: "Fansipan" },
  { id: 11, question: "Tác giả của kiệt tác 'Truyện Kiều' là ai?", options: ["Nguyễn Trãi", "Nguyễn Du", "Hồ Xuân Hương", "Nguyễn Khuyến"], correctAnswer: "Nguyễn Du" },
  { id: 12, question: "Thành phố nào được mệnh danh là 'Thành phố của những cây cầu'?", options: ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"], correctAnswer: "Đà Nẵng" },
  { id: 13, question: "Ai là người sáng lập ra nhà Lý và dời đô về Thăng Long?", options: ["Lý Thường Kiệt", "Lý Thái Tổ", "Lý Thánh Tông", "Lý Nhân Tông"], correctAnswer: "Lý Thái Tổ" },
  { id: 14, question: "Việt Nam có đường bờ biển dài khoảng bao nhiêu km?", options: ["2000 km", "3260 km", "4000 km", "1500 km"], correctAnswer: "3260 km" },
  { id: 15, question: "Hang động tự nhiên lớn nhất thế giới nằm ở Việt Nam tên là gì?", options: ["Động Phong Nha", "Động Thiên Đường", "Hang Sơn Đoòng", "Hang Én"], correctAnswer: "Hang Sơn Đoòng" },
  { id: 16, question: "Địa danh nào được UNESCO công nhận là Di sản thiên nhiên thế giới hai lần?", options: ["Vịnh Hạ Long", "Phong Nha - Kẻ Bàng", "Tràng An", "Cố đô Huế"], correctAnswer: "Vịnh Hạ Long" },
  { id: 17, question: "Lá cờ đỏ sao vàng xuất hiện lần đầu trong cuộc khởi nghĩa nào?", options: ["Khởi nghĩa Nam Kỳ", "Khởi nghĩa Bắc Sơn", "Cách mạng tháng Tám", "Xô Viết Nghệ Tĩnh"], correctAnswer: "Khởi nghĩa Nam Kỳ" },
  { id: 18, question: "Vị vua nào đã đánh tan quân Thanh vào dịp Tết Kỷ Dậu 1789?", options: ["Lê Lợi", "Quang Trung (Nguyễn Huệ)", "Trần Hưng Đạo", "Gia Long"], correctAnswer: "Quang Trung (Nguyễn Huệ)" },
  { id: 19, question: "Bài hát Quốc ca của Việt Nam tên là gì?", options: ["Như có Bác trong ngày đại thắng", "Tiến quân ca", "Việt Nam quê hương tôi", "Đất nước trọn niềm vui"], correctAnswer: "Tiến quân ca" },
  { id: 20, question: "Tỉnh nào là điểm cực Bắc của Việt Nam?", options: ["Hà Giang", "Cao Bằng", "Lào Cai", "Lạng Sơn"], correctAnswer: "Hà Giang" }
];

// === THEME CONFIGURATION ===
const THEMES: Theme[] = [
  {
    id: 'cyber', name: 'Cyber Gold',
    colors: { bg: '#0E1117', paper: '#161B22', card: '#0E1117', text: '#E2E8F0', subText: '#94A3B8', accent: '#FFD700', border: '#1F2937', highlight: 'rgba(255, 215, 0, 0.1)' }
  },
  {
    id: 'light', name: 'Professional Light',
    colors: { bg: '#F8FAFC', paper: '#FFFFFF', card: '#F1F5F9', text: '#0F172A', subText: '#64748B', accent: '#2563EB', border: '#E2E8F0', highlight: 'rgba(37, 99, 235, 0.1)' }
  },
  {
    id: 'matrix', name: 'Matrix Green',
    colors: { bg: '#000000', paper: '#111111', card: '#050505', text: '#4ADE80', subText: '#22C55E', accent: '#00FF00', border: '#14532D', highlight: 'rgba(0, 255, 0, 0.15)' }
  },
  {
    id: 'ocean', name: 'Ocean Blue',
    colors: { bg: '#020617', paper: '#0F172A', card: '#1E293B', text: '#E2E8F0', subText: '#94A3B8', accent: '#38BDF8', border: '#1E293B', highlight: 'rgba(56, 189, 248, 0.15)' }
  },
  {
    id: 'sunset', name: 'Sunset Red',
    colors: { bg: '#180808', paper: '#250F0F', card: '#180808', text: '#FFE4E6', subText: '#FDA4AF', accent: '#FB7185', border: '#4C1D1D', highlight: 'rgba(251, 113, 133, 0.15)' }
  },
  {
    id: 'royal', name: 'Royal Purple',
    colors: { bg: '#160826', paper: '#240F3E', card: '#160826', text: '#E9D5FF', subText: '#C084FC', accent: '#A855F7', border: '#4C1D95', highlight: 'rgba(168, 85, 247, 0.15)' }
  },
  {
    id: 'mint', name: 'Fresh Mint',
    colors: { bg: '#042F2E', paper: '#115E59', card: '#042F2E', text: '#CCFBF1', subText: '#5EEAD4', accent: '#2DD4BF', border: '#134E4A', highlight: 'rgba(45, 212, 191, 0.15)' }
  },
  {
    id: 'coffee', name: 'Warm Coffee',
    colors: { bg: '#1C1917', paper: '#292524', card: '#1C1917', text: '#F5F5F4', subText: '#A8A29E', accent: '#D6D3D1', border: '#44403C', highlight: 'rgba(214, 211, 209, 0.15)' }
  },
  {
    id: 'rose', name: 'Sweet Rose',
    colors: { bg: '#FFF1F2', paper: '#FFE4E6', card: '#FFF1F2', text: '#881337', subText: '#BE123C', accent: '#E11D48', border: '#FECDD3', highlight: 'rgba(225, 29, 72, 0.1)' }
  },
  {
    id: 'dracula', name: 'Midnight Gray',
    colors: { bg: '#18181B', paper: '#27272A', card: '#18181B', text: '#F4F4F5', subText: '#A1A1AA', accent: '#E4E4E7', border: '#3F3F46', highlight: 'rgba(228, 228, 231, 0.15)' }
  }
];

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing system core...");

  useEffect(() => {
    const messages = [
      "Establishing secure connection...",
      "Verifying geolocation...",
      "Loading Vietnamese voice models...",
      "Calibrating AI neural network...",
      "Checking integrity signatures...",
      "Optimizing audio latency...",
      "Ready to synthesize."
    ];
    
    let step = 0;
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 10, 100));
      if (step < messages.length) {
        setStatus(messages[step]);
        step++;
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0E1117] text-[#E2E8F0] font-sans">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>
        <div className="relative w-24 h-24 border-t-4 border-yellow-500 rounded-full animate-spin flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.5)]">
           <Cpu size={40} className="text-yellow-500 animate-pulse" />
        </div>
      </div>
      
      <h1 className="text-2xl font-black tracking-widest uppercase mb-2 animate-bounce">
        TTS COMMUNITY
      </h1>
      <div className="flex items-center gap-2 mb-8">
        <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold uppercase">VN Edition</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold uppercase">AI Core v2.5</span>
      </div>

      <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mb-4 relative">
        <div 
          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="h-6 flex items-center justify-center">
         <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider animate-pulse">
           [{progress.toFixed(0)}%] {status}
         </p>
      </div>

      <div className="absolute bottom-10 text-[10px] text-gray-600 font-mono">
        SECURE CONNECTION • ENCRYPTED • COPYRIGHT © DAO VAN PHUONG
      </div>
    </div>
  );
};

// --- SECURITY LOCKOUT SCREEN ---
const SecurityLockoutScreen = ({ unlockTime, hwId, ip }: { unlockTime: number, hwId: string, ip: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = unlockTime - now;

      if (diff <= 0) {
        window.location.reload(); // Try to unban if time expired
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockTime]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black text-red-500 p-8 text-center font-mono">
      <div className="animate-pulse mb-8">
        <Skull size={120} strokeWidth={1} />
      </div>
      <h1 className="text-4xl font-black uppercase mb-4 tracking-tighter">Security Lockout</h1>
      <p className="text-xl text-red-300 mb-8 max-w-2xl border-t border-b border-red-900 py-4">
        Phát hiện hành vi chỉnh sửa trái phép Mã nguồn hoặc xóa thông tin bản quyền tác giả.
        Hệ thống đã kích hoạt cơ chế bảo vệ tự động.
      </p>
      
      <div className="grid grid-cols-2 gap-8 mb-10 w-full max-w-md">
        <div className="p-4 border border-red-900 rounded bg-red-950/20">
          <p className="text-xs text-red-400 mb-1">BLOCKED HW-ID</p>
          <p className="font-bold">{hwId}</p>
        </div>
        <div className="p-4 border border-red-900 rounded bg-red-950/20">
          <p className="text-xs text-red-400 mb-1">BLOCKED IP</p>
          <p className="font-bold">{ip}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-red-600">Thời gian mở khóa tự động</p>
        <div className="text-6xl font-black font-mono bg-red-950 px-6 py-4 rounded-xl border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
          {timeLeft}
        </div>
      </div>
      
      <p className="mt-12 text-xs text-red-800">
        ERROR CODE: 0xDEAD_COPYRIGHT_VIOLATION
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SINGLE);
  const [speed, setSpeed] = useState(1.0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceOffline, setForceOffline] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>('cyber');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  
  // Security Ban State
  const [isBanned, setIsBanned] = useState(false);
  const [banUnlockTime, setBanUnlockTime] = useState(0);

  // Auth & Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  
  // Security Checks
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [isVietnameseIp, setIsVietnameseIp] = useState(false);
  const [clientIp, setClientIp] = useState<string>("Unknown");
  const [hardwareFingerprint, setHardwareFingerprint] = useState<string>("");
  const [dailyUsage, setDailyUsage] = useState<number>(0);

  // Human 99% Mode Limits
  const [useHumanMode, setUseHumanMode] = useState(true);
  const [humanUsage, setHumanUsage] = useState<number>(0);
  const [timeUntilReset, setTimeUntilReset] = useState<string>("--:--:--");

  // Quiz State
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [quizPassed, setQuizPassed] = useState(false);
  const [pendingDownloadLink, setPendingDownloadLink] = useState<string|null>(null);

  const [singleProfile, setSingleProfile] = useState<VoiceProfile>(DEFAULT_PROFILE);
  const [singleText, setSingleText] = useState("Chào mừng bạn đến với FREE - TTS COMMUNITY!\n\nĐây là công cụ chuyển đổi văn bản thành giọng nói miễn phí, hỗ trợ đa vùng miền (Bắc, Trung, Nam) và cảm xúc tự nhiên.\n\nChúc bạn có những trải nghiệm tuyệt vời!");
  
  const [speakers, setSpeakers] = useState<Speaker[]>([
    { id: '1', name: 'ĐÀO PHƯƠNG', profile: { ...DEFAULT_PROFILE, gender: 'Nam', baseVoice: 'Kore', intonation: 'Tự nhiên' } },
    { id: '2', name: 'NGUYỄN NHUNG', profile: { ...DEFAULT_PROFILE, gender: 'Nữ', baseVoice: 'Leda', intonation: 'Trang trọng', region: 'Miền Nam (Sài Gòn)' } },
  ]);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([
    { id: '1', speakerId: '1', text: 'Chào Nhung, cậu đã thử phiên bản TTS Community mới chưa?' },
    { id: '2', speakerId: '2', text: 'Rồi Phương ơi! Nghe nói bản này hoàn toàn miễn phí và không giới hạn từ luôn đó.' },
  ]);

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'raw'>('builder');

  const theme = useMemo(() => THEMES.find(t => t.id === activeThemeId) || THEMES[0], [activeThemeId]);
  const isSystemOnline = isOnline && !forceOffline;

  const charCount = useMemo(() => {
    if (mode === AppMode.SINGLE) return singleText.length;
    return dialogue.reduce((acc, line) => acc + line.text.length, 0);
  }, [mode, singleText, dialogue]);

  const wordCount = useMemo(() => {
    const countWords = (str: string) => str.trim().split(/\s+/).filter(word => word !== "").length;
    if (mode === AppMode.SINGLE) return countWords(singleText);
    return dialogue.reduce((acc, line) => acc + countWords(line.text), 0);
  }, [mode, singleText, dialogue]);

  // Generate a hardware fingerprint
  useEffect(() => {
    const getFingerprint = () => {
      const nav = window.navigator as any;
      const screen = window.screen;
      const hardwareConcurrency = nav.hardwareConcurrency || 'unknown';
      const deviceMemory = nav.deviceMemory || 'unknown';
      const userAgent = nav.userAgent;
      const screenRes = `${screen.width}x${screen.height}`;
      // Simple hash simulation
      const raw = `${userAgent}-${hardwareConcurrency}-${deviceMemory}-${screenRes}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `HW-${Math.abs(hash)}`;
    };
    setHardwareFingerprint(getFingerprint());
  }, []);

  // BAN LOGIC CHECK
  useEffect(() => {
    const lockoutKey = 'tts_sec_lockout';
    const storedLockout = localStorage.getItem(lockoutKey);
    if (storedLockout) {
      const unlockTime = parseInt(storedLockout, 10);
      if (Date.now() < unlockTime) {
        setIsBanned(true);
        setBanUnlockTime(unlockTime);
      } else {
        localStorage.removeItem(lockoutKey); // Remove expired ban
      }
    }
  }, []);

  // IP Geolocation Check & Usage Tracking & GLOBAL LOADING LOGIC
  useEffect(() => {
    const checkSecurity = async () => {
      setIsCheckingSecurity(true);
      
      const checkService = async (url: string): Promise<{ip: string, country: string} | null> => {
         try {
           const res = await fetch(url);
           if (!res.ok) throw new Error('Network response was not ok');
           const data = await res.json();
           
           if (data.ip && data.country_code) return { ip: data.ip, country: data.country_code };
           if (data.ipAddress && data.countryCode) return { ip: data.ipAddress, country: data.countryCode };
           if (data.ip && data.country) return { ip: data.ip, country: data.country };
           return null;
         } catch (e) {
           return null;
         }
      };

      try {
        let result = await checkService('https://ipwho.is/');
        if (!result) result = await checkService('https://api.db-ip.com/v2/free/self');
        if (!result) result = await checkService('https://ipapi.co/json/');

        if (result) {
          setClientIp(result.ip);
          setIsVietnameseIp(result.country === 'VN' || result.country === 'Vietnam');
        } else {
          setClientIp("Unknown");
          setIsVietnameseIp(false);
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Load Daily Total Usage
        const storageKey = `tts_usage_${today}`;
        const storedUsage = localStorage.getItem(storageKey);
        if (storedUsage) {
          setDailyUsage(parseInt(storedUsage, 10));
        } else {
          setDailyUsage(0);
          for(let i=0; i<localStorage.length; i++) {
            const key = localStorage.key(i);
            if(key && key.startsWith('tts_usage_') && key !== storageKey) {
              localStorage.removeItem(key);
            }
          }
        }

        // Load Human 99% Usage
        const humanStorageKey = `tts_human_usage_${today}`;
        const storedHumanUsage = localStorage.getItem(humanStorageKey);
        if (storedHumanUsage) {
          setHumanUsage(parseInt(storedHumanUsage, 10));
        } else {
          setHumanUsage(0);
          for(let i=0; i<localStorage.length; i++) {
            const key = localStorage.key(i);
            if(key && key.startsWith('tts_human_usage_') && key !== humanStorageKey) {
              localStorage.removeItem(key);
            }
          }
        }

      } catch (error) {
        console.error("Security check failed:", error);
        setIsVietnameseIp(false); 
      } finally {
        setIsCheckingSecurity(false);
      }
    };

    const initApp = async () => {
      // Simulate minimum load time for effect (2.5s) concurrent with security check
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 2500));
      await Promise.all([checkSecurity(), minLoadTime]);
      setIsGlobalLoading(false);
    };

    initApp();
  }, []);

  // Countdown Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0); // Reset at midnight
        const diff = tomorrow.getTime() - now.getTime();
        
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeUntilReset(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // INTEGRITY CHECK: Anti-Tamper mechanism (72 Hours Ban)
  useEffect(() => {
    // Only run if not already banned
    if (isBanned) return;

    const integrityInterval = setInterval(() => {
      const bodyText = document.body.innerText;
      
      // OBFUSCATED STRINGS
      // "Đào Văn Phương"
      const authorSig = String.fromCharCode(272, 224, 111, 32, 86, 259, 110, 32, 80, 104, 432, 417, 110, 103); 
      // "Daovanphuong38"
      const contactSig = String.fromCharCode(68, 97, 111, 118, 97, 110, 112, 104, 117, 111, 110, 103, 51, 56);
      // "0945053428"
      const phoneSig = String.fromCharCode(48, 57, 52, 53, 48, 53, 51, 52, 50, 56);

      // Check if ANY of the signatures are missing from the rendered text
      if (!bodyText.includes(authorSig) && !bodyText.includes(contactSig) && !bodyText.includes(phoneSig)) {
         // TAMPER DETECTED: Trigger 72h Ban
         const BAN_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
         const unlockTime = Date.now() + BAN_DURATION_MS;
         
         localStorage.setItem('tts_sec_lockout', unlockTime.toString());
         
         setBanUnlockTime(unlockTime);
         setIsBanned(true);
      }
    }, 4000); // Check every 4 seconds
    return () => clearInterval(integrityInterval);
  }, [isBanned]);

  const isOverDailyLimit = !isAdmin && (dailyUsage + charCount) > DAILY_LIMIT;
  const isOverHumanLimit = !isAdmin && useHumanMode && (humanUsage + charCount) > HUMAN_DAILY_LIMIT;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === atob(_SEC_KEY)) {
      setIsAdmin(true);
      setShowAuthModal(false);
      setAuthError(false);
      setPasswordInput("");
    } else {
      setAuthError(true);
    }
  };

  const handleRefine = async () => {
    if (!isSystemOnline || refining) return;
    setRefining(true);
    try {
      if (mode === AppMode.SINGLE) {
        const polished = await refineText(singleText);
        setSingleText(polished);
      } else {
        const newDialogue = await Promise.all(dialogue.map(async line => ({
          ...line,
          text: await refineText(line.text)
        })));
        setDialogue(newDialogue);
      }
    } catch (error) {
      console.error("Refine failed", error);
    } finally {
      setRefining(false);
    }
  };

  const handlePreview = async (profile: VoiceProfile, sourceId: string) => {
    if (!isSystemOnline) return alert("Cần kết nối mạng để nghe thử.");
    setPreviewLoading(sourceId);
    try {
      const sampleText = "Chào bạn, đây là mẫu giọng đọc thực tế với nhịp thở tự nhiên của tôi.";
      const audioData = await generateSpeech(sampleText, profile, 1.0);
      if (audioData) {
        const blob = createWavBlob(audioData);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (error: any) {
      console.error("Preview failed", error);
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!isSystemOnline) return alert("Vui lòng kiểm tra kết nối mạng.");
    if (!isAdmin && isOverDailyLimit) return alert(`Bạn đã vượt quá giới hạn tổng ${DAILY_LIMIT.toLocaleString()} ký tự/ngày.`);
    
    // Check Human 99% Limit
    if (useHumanMode && !isAdmin && isOverHumanLimit) {
      return alert(`Bạn đã hết quota Human 99% (${HUMAN_DAILY_LIMIT.toLocaleString()} ký tự/ngày). Vui lòng tắt chế độ "Human 99%" để tiếp tục sử dụng chất lượng thường.`);
    }

    setLoading(true);
    setAudioUrl(null);
    try {
      let pcmData: Uint8Array | undefined;
      // Note: We might want to pass 'useHumanMode' to services if we had logic to switch prompt complexity
      // For now, we assume standard generation consumes quota, and Human Mode consumes specific quota.
      
      if (mode === AppMode.SINGLE) {
        pcmData = await generateSpeech(singleText, singleProfile, speed);
      } else {
        const dialogueData = dialogue.map(line => {
          const speaker = speakers.find(s => s.id === line.speakerId);
          return {
            speakerName: speaker?.name || "Người nói",
            profile: speaker?.profile || DEFAULT_PROFILE,
            text: line.text
          };
        });
        pcmData = await generateDialogue(dialogueData);
      }

      if (pcmData) {
        setAudioUrl(URL.createObjectURL(createWavBlob(pcmData)));
        const today = new Date().toISOString().split('T')[0];
        
        // Update Total Usage
        const storageKey = `tts_usage_${today}`;
        const newUsage = dailyUsage + charCount;
        setDailyUsage(newUsage);
        localStorage.setItem(storageKey, newUsage.toString());

        // Update Human Usage if applicable
        if (useHumanMode) {
           const humanStorageKey = `tts_human_usage_${today}`;
           const newHumanUsage = humanUsage + charCount;
           setHumanUsage(newHumanUsage);
           localStorage.setItem(humanStorageKey, newHumanUsage.toString());
        }
      }
    } catch (error: any) {
      alert(`Lỗi hệ thống: ${error.message || "Không thể kết nối API"}`);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (link: string) => {
    setPendingDownloadLink(link);
    const shuffled = [...QUESTION_POOL].sort(() => 0.5 - Math.random());
    setCurrentQuestions(shuffled.slice(0, 10));
    setUserAnswers({});
    setQuizPassed(false);
    setShowQuiz(true);
  };

  const handleQuizAnswer = (qId: number, answer: string) => {
    setUserAnswers(prev => ({...prev, [qId]: answer}));
  };

  const submitQuiz = () => {
    let correct = 0;
    currentQuestions.forEach(q => {
        if(userAnswers[q.id] === q.correctAnswer) correct++;
    });
    
    if (correct === currentQuestions.length) {
        setQuizPassed(true);
        if (pendingDownloadLink) {
          const a = document.createElement('a');
          a.href = pendingDownloadLink;
          a.download = `community_tts_${Date.now()}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setTimeout(() => setShowQuiz(false), 2000); 
    } else {
        alert(`Bạn chỉ trả lời đúng ${correct}/${currentQuestions.length} câu. Vui lòng thử lại để chứng minh bạn là người dùng thực.`);
    }
  };

  const handleTabChange = (tab: 'builder' | 'raw') => {
    setActiveTab(tab);
  };

  const ProfileSelector = ({ profile, onChange, onPreview, isPreviewing }: { 
    profile: VoiceProfile, 
    onChange: (p: VoiceProfile) => void,
    onPreview: () => void,
    isPreviewing: boolean 
  }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: theme.colors.subText }}>Giọng gốc</label>
          <select 
            value={profile.baseVoice} 
            onChange={(e) => onChange({ ...profile, baseVoice: e.target.value as BaseVoice })} 
            className="w-full rounded-lg px-2 py-1.5 text-xs outline-none transition-all border"
            style={{ backgroundColor: theme.colors.card, color: theme.colors.accent, borderColor: theme.colors.border }}
          >
            {BASE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: theme.colors.subText }}>Ngữ điệu</label>
          <select 
            value={profile.intonation} 
            onChange={(e) => onChange({ ...profile, intonation: e.target.value as Intonation })} 
            className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
            style={{ backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }}
          >
            {INTONATIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: theme.colors.subText }}>Vùng miền</label>
          <select 
            value={profile.region} 
            onChange={(e) => onChange({ ...profile, region: e.target.value as Region })} 
            className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
            style={{ backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <button 
        onClick={onPreview} 
        disabled={isPreviewing}
        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all disabled:opacity-50"
        style={{ backgroundColor: theme.colors.highlight, color: theme.colors.text, borderColor: theme.colors.border }}
      >
        {isPreviewing ? <Loader2 size={12} className="animate-spin" /> : <Headphones size={12} />}
        {isPreviewing ? "ĐANG TẠO MẪU..." : "NGHE THỬ GIỌNG NÀY"}
      </button>
    </div>
  );

  if (isBanned) {
    return <SecurityLockoutScreen unlockTime={banUnlockTime} hwId={hardwareFingerprint} ip={clientIp} />;
  }

  if (isGlobalLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen w-full flex flex-col transition-colors duration-300 overflow-hidden" style={{ backgroundColor: theme.colors.bg, color: theme.colors.text }}>
      
      {/* AUTH MODAL (Standard) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-3xl shadow-2xl border" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.accent }}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-black uppercase flex items-center gap-2" style={{ color: theme.colors.text }}>
                 <Lock size={18} className="text-red-500" /> Admin Access
               </h3>
               <button onClick={() => setShowAuthModal(false)} style={{ color: theme.colors.subText }}><X size={20}/></button>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: theme.colors.subText }}>
              Tính năng này (Mã nguồn) bị giới hạn. Vui lòng nhập mật khẩu quản trị viên để mở khóa.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
               <div className="space-y-2">
                 <div className="relative">
                   <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.colors.subText }} />
                   <input 
                    type="password" 
                    autoFocus
                    placeholder="Nhập mật khẩu..." 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none focus:border-opacity-100 transition-all"
                    style={{ backgroundColor: theme.colors.bg, borderColor: authError ? '#EF4444' : theme.colors.border, color: theme.colors.text }}
                   />
                 </div>
                 {authError && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Mật khẩu không đúng</p>}
               </div>
               <button type="submit" className="w-full py-3 rounded-xl font-black text-xs uppercase hover:brightness-110 transition-all" style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg }}>
                 Mở Khóa
               </button>
            </form>
          </div>
        </div>
      )}

      {/* QUIZ MODAL FOR NON-VN IP */}
      {showQuiz && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 p-4">
           <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border-2 shadow-2xl relative overflow-hidden" 
             style={{ backgroundColor: theme.colors.bg, borderColor: quizPassed ? '#22C55E' : '#B91C1C' }}>
              
              {/* Header - RED/YELLOW PATRIOTIC THEME */}
              <div className="p-6 border-b flex justify-between items-center relative z-10 bg-red-800 border-red-700">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-yellow-400 text-red-800"><ShieldCheck size={24} /></div>
                     <div>
                        <h2 className="text-xl font-black uppercase tracking-wider text-yellow-400">Thử thách lòng yêu nước</h2>
                        <p className="text-xs text-red-200">Trả lời đúng 10/10 câu để xác minh IP và tải xuống</p>
                     </div>
                  </div>
                  <button onClick={() => setShowQuiz(false)} className="hover:bg-red-900 p-2 rounded-full transition-colors text-white"><X size={20} /></button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {quizPassed ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 space-y-4 animate-in zoom-in">
                       <CheckCircle2 size={80} className="text-green-500" />
                       <h3 className="text-2xl font-black uppercase text-green-500">Xác minh thành công!</h3>
                       <p className="text-gray-400 text-center max-w-md">Bạn đã trả lời đúng tất cả câu hỏi. File âm thanh đang được tải xuống...</p>
                    </div>
                 ) : (
                    <div className="grid gap-6">
                       {currentQuestions.map((q, idx) => (
                          <div key={q.id} className="space-y-3 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 transition-colors">
                             <h3 className="font-bold text-sm md:text-base flex gap-2">
                                <span className="text-yellow-500 min-w-[24px]">#{idx + 1}.</span> 
                                {q.question}
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                                {q.options.map((opt) => (
                                   <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${userAnswers[q.id] === opt ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-gray-700 hover:border-gray-500'}`}>
                                      <input 
                                        type="radio" 
                                        name={`q-${q.id}`} 
                                        value={opt}
                                        checked={userAnswers[q.id] === opt}
                                        onChange={() => handleQuizAnswer(q.id, opt)}
                                        className="hidden" 
                                      />
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${userAnswers[q.id] === opt ? 'border-yellow-500' : 'border-gray-500'}`}>
                                         {userAnswers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                                      </div>
                                      <span className="text-xs md:text-sm font-medium">{opt}</span>
                                   </label>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* Footer */}
              {!quizPassed && (
                <div className="p-6 border-t bg-gray-900/50 flex justify-between items-center" style={{ borderColor: theme.colors.border }}>
                    <div className="text-xs text-gray-500 font-mono">
                       Đã trả lời: {Object.keys(userAnswers).length}/10
                    </div>
                    <button 
                      onClick={submitQuiz}
                      disabled={Object.keys(userAnswers).length < 10}
                      className="px-8 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-500/20"
                    >
                       Xác nhận & Tải xuống
                    </button>
                </div>
              )}
           </div>
        </div>
      )}

      <header className="p-4 border-b flex justify-between items-center shadow-2xl z-30 transition-colors duration-300 relative" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}>
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 rounded-lg border transition-colors"
            style={{ borderColor: theme.colors.border, color: theme.colors.accent }}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="overflow-hidden">
            <h1 className="text-sm md:text-lg font-black tracking-tighter uppercase italic flex flex-wrap items-center gap-2" style={{ color: theme.colors.text }}>
              TTS COMMUNITY <span className="px-1.5 py-0.5 rounded text-[8px] md:text-[10px] not-italic font-black border" style={{ backgroundColor: theme.colors.accent, color: theme.colors.bg, borderColor: theme.colors.accent }}>VN ONLY</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <Wind size={12} className="animate-pulse" /> Breath Sync Active
          </div>
          <button 
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
            style={{ 
              backgroundColor: isAdmin ? 'rgba(34, 197, 94, 0.1)' : theme.colors.card, 
              color: isAdmin ? '#4ADE80' : theme.colors.subText,
              borderColor: isAdmin ? '#4ADE80' : theme.colors.border 
            }}
            title={isAdmin ? "Đã mở khóa Admin" : "Chế độ Khách (Bị giới hạn)"}
          >
            {isAdmin ? <Unlock size={12} /> : <Lock size={12} />} <span className="hidden md:inline">{isAdmin ? "Admin Unlocked" : "Guest Mode"}</span>
          </button>
          <button 
            onClick={() => setForceOffline(!forceOffline)}
            className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all hover:scale-105 active:scale-95 cursor-pointer select-none`}
            style={{ 
              backgroundColor: isSystemOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isSystemOnline ? '#4ADE80' : '#F87171',
              borderColor: isSystemOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
            }}
            title="Click để giả lập trạng thái Offline"
          >
            {isSystemOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* SIDEBAR - Responsive: Drawer on Mobile, Fixed on Desktop */}
        <aside 
          className={`
            fixed lg:static top-0 left-0 z-50 h-full w-[85%] max-w-[320px] lg:w-72 border-r p-5 space-y-6 overflow-y-auto transition-all duration-300
            ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}
        >
          {/* Close button only visible on mobile */}
          <div className="lg:hidden flex justify-end mb-4">
             <button onClick={() => setShowMobileMenu(false)} style={{ color: theme.colors.text }}><X size={24} /></button>
          </div>
          
          {/* SECURITY STATUS CARD */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.colors.subText }}>
              <ShieldCheck size={14} /> Security Matrix
            </label>
            <div className="p-3 border rounded-xl text-[9px] font-mono space-y-2" style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.subText }}>
               <div className="flex justify-between items-center">
                  <span>IP:</span>
                  <span className={isVietnameseIp ? "text-green-500" : "text-red-500"}>{clientIp}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span>REGION:</span>
                  <span className={isVietnameseIp ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{isCheckingSecurity ? "SCANNING..." : (isVietnameseIp ? "VIETNAM (VN)" : "INTERNATIONAL")}</span>
               </div>
               <div className="flex justify-between items-center" title={hardwareFingerprint}>
                  <span>HW-ID:</span>
                  <span className="text-gray-500">{hardwareFingerprint.substring(0, 12)}...</span>
               </div>
               <div className="flex justify-between items-center">
                  <span>VPN:</span>
                  <span className={isVietnameseIp || isAdmin ? "text-green-500" : "text-yellow-500"}>{isVietnameseIp || isAdmin ? "PASSED" : "DETECTED"}</span>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.colors.subText }}>
              <BarChart3 size={14} /> Server Status
            </label>
            <div className="p-4 border rounded-xl space-y-3" style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}>
              <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: theme.colors.border }}>
                <span className="text-[10px] font-bold uppercase" style={{ color: theme.colors.subText }}>Next Reset:</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1" style={{ backgroundColor: theme.colors.bg, color: theme.colors.accent, borderColor: theme.colors.border }}>
                   <Clock size={10} /> {timeUntilReset}
                </span>
              </div>

              {/* GLOBAL LIMIT */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold" style={{ color: theme.colors.subText }}>DAILY QUOTA:</span>
                <span className="text-xs font-mono font-black" style={{ color: isOverDailyLimit ? '#EF4444' : theme.colors.text }}>
                   {dailyUsage.toLocaleString()} / {isAdmin ? "∞" : DAILY_LIMIT.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: theme.colors.border }}>
                  <div className="h-full transition-all duration-500" style={{ width: `${isAdmin ? 0 : Math.min(100, (dailyUsage / DAILY_LIMIT) * 100)}%`, backgroundColor: isOverDailyLimit ? '#EF4444' : theme.colors.text }}></div>
              </div>
              
              {/* HUMAN 99% LIMIT */}
              <div className="flex justify-between items-center pt-1 border-t border-dashed" style={{ borderColor: theme.colors.border }}>
                <span className="text-[10px] font-bold" style={{ color: theme.colors.accent }}>HUMAN 99%:</span>
                <span className="text-xs font-mono font-black" style={{ color: isOverHumanLimit ? '#EF4444' : theme.colors.accent }}>
                   {humanUsage.toLocaleString()} / {isAdmin ? "∞" : HUMAN_DAILY_LIMIT.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.border }}>
                  <div className="h-full transition-all duration-500" style={{ width: `${isAdmin ? 0 : Math.min(100, (humanUsage / HUMAN_DAILY_LIMIT) * 100)}%`, backgroundColor: isOverHumanLimit ? '#EF4444' : theme.colors.accent }}></div>
              </div>
            </div>
          </div>

           {/* THEME SWITCHER */}
           <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.colors.subText }}>
              <Palette size={14} /> Giao diện ({activeThemeId})
            </label>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveThemeId(t.id)}
                  className="w-full aspect-square rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: t.colors.bg, 
                    borderColor: activeThemeId === t.id ? theme.colors.accent : t.colors.border 
                  }}
                  title={t.name}
                >
                  {activeThemeId === t.id && <Check size={12} style={{ color: t.colors.accent }} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6">
             <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-2xl border shadow-lg" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center justify-center gap-2 font-black text-xs mb-2 uppercase tracking-widest" 
                  style={{ 
                    background: 'linear-gradient(90deg, #F59E0B, #EF4444, #F59E0B)', 
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                  <User size={14} className="text-yellow-500" fill="currentColor" /> ĐÀO VĂN PHƯƠNG
                </div>
                <p className="text-[10px] text-center leading-relaxed italic border-t pt-2 mt-2 mb-3" style={{ color: theme.colors.subText, borderColor: theme.colors.border }}>
                  "Thiết kế bởi Đào Văn Phương - Facebook: Daovanphuong38 - Zalo: 0945053428"
                </p>
                <div className="w-full rounded-lg overflow-hidden border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                     <img src={VN_FLAG_URL} alt="Vietnam" className="w-full h-auto aspect-[3/2] object-cover" />
                </div>
             </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {showMobileMenu && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setShowMobileMenu(false)}></div>}

        <main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
          <section className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 lg:overflow-y-auto border-r transition-colors duration-300" style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}>
            <div className="border rounded-3xl p-4 lg:p-6 space-y-4 lg:space-y-6 shadow-2xl relative overflow-hidden group transition-colors duration-300" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}>
              <div className="absolute top-0 left-0 w-1 h-full transition-all" style={{ backgroundColor: theme.colors.highlight }}></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest" style={{ color: theme.colors.subText }}><Settings size={14} /> Voice Configuration</div>
                <div className="text-[10px] font-mono flex items-center gap-2" style={{ color: theme.colors.subText }}>
                  <Hash size={12} /> {wordCount.toLocaleString()} WORDS | {charCount.toLocaleString()} CHARS
                </div>
              </div>

              {mode === AppMode.SINGLE ? (
                <ProfileSelector 
                  profile={singleProfile} 
                  onChange={setSingleProfile} 
                  onPreview={() => handlePreview(singleProfile, 'single')}
                  isPreviewing={previewLoading === 'single'}
                />
              ) : (
                <div className="space-y-4">
                  {speakers.map((s, idx) => (
                    <div key={s.id} className="p-4 rounded-2xl border hover:border-opacity-100 transition-all" style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase italic tracking-wider flex items-center gap-2" style={{ color: theme.colors.accent }}><User size={12} /> {s.name}</span>
                        <input value={s.name} onChange={(e) => {
                          const ns = [...speakers];
                          ns[idx].name = e.target.value;
                          setSpeakers(ns);
                        }} className="bg-transparent border-b text-xs text-right outline-none transition-all" style={{ color: theme.colors.text, borderColor: theme.colors.border }} />
                      </div>
                      <ProfileSelector 
                        profile={s.profile} 
                        onChange={(p) => {
                          const ns = [...speakers];
                          ns[idx].profile = p;
                          setSpeakers(ns);
                        }} 
                        onPreview={() => handlePreview(s.profile, s.id)}
                        isPreviewing={previewLoading === s.id}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* CONTROLS SECTION */}
              <div className="pt-4 border-t space-y-4" style={{ borderColor: theme.colors.border }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: theme.colors.subText }}>Chế độ vận hành</label>
                        <div className="flex p-1 rounded-xl border" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                            <button onClick={() => setMode(AppMode.SINGLE)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all`}
                                style={{
                                backgroundColor: mode === AppMode.SINGLE ? theme.colors.accent : 'transparent',
                                color: mode === AppMode.SINGLE ? theme.colors.bg : theme.colors.subText,
                                }}
                            >
                                <Volume2 size={14} /> ĐƠN THOẠI
                            </button>
                            <button onClick={() => setMode(AppMode.DIALOGUE)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all`}
                                style={{
                                backgroundColor: mode === AppMode.DIALOGUE ? theme.colors.accent : 'transparent',
                                color: mode === AppMode.DIALOGUE ? theme.colors.bg : theme.colors.subText,
                                }}
                            >
                                <MessageSquare size={14} /> ĐỐI THOẠI
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: theme.colors.subText }}>
                             Chất lượng Human 99% {isOverHumanLimit && !isAdmin ? "(ĐÃ HẾT QUOTA)" : ""}
                        </label>
                        <button 
                            onClick={() => !isOverHumanLimit && setUseHumanMode(!useHumanMode)}
                            disabled={isOverHumanLimit && !isAdmin}
                            className={`w-full h-10 px-3 rounded-xl border flex items-center justify-between transition-all ${isOverHumanLimit && !isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-opacity-100'}`}
                            style={{ 
                                borderColor: useHumanMode ? theme.colors.accent : theme.colors.border, 
                                backgroundColor: theme.colors.card,
                                color: useHumanMode ? theme.colors.accent : theme.colors.subText
                            }}
                        >
                            <span className="text-[10px] font-bold">
                                {useHumanMode ? "ĐANG BẬT (CAO CẤP)" : "ĐANG TẮT (TIÊU CHUẨN)"}
                            </span>
                            {useHumanMode ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                    </div>
                  </div>
              </div>
            </div>

            <div className="border rounded-3xl flex flex-col h-[400px] shadow-2xl overflow-hidden relative transition-colors duration-300" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}>
               <div className="flex border-b items-center overflow-x-auto" style={{ backgroundColor: theme.colors.border, borderColor: theme.colors.border }}>
                 <button onClick={() => setActiveTab('builder')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap px-4`}
                   style={{ 
                     backgroundColor: activeTab === 'builder' ? theme.colors.bg : theme.colors.paper,
                     color: activeTab === 'builder' ? theme.colors.accent : theme.colors.subText,
                     borderBottom: activeTab === 'builder' ? `2px solid ${theme.colors.accent}` : 'none'
                   }}
                 >Visual Editor</button>
                 <button onClick={() => handleTabChange('raw')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap px-4`}
                    style={{ 
                     backgroundColor: activeTab === 'raw' ? theme.colors.bg : theme.colors.paper,
                     color: activeTab === 'raw' ? theme.colors.accent : theme.colors.subText,
                     borderBottom: activeTab === 'raw' ? `2px solid ${theme.colors.accent}` : 'none'
                   }}
                 >
                   Source Script
                 </button>
                 <button 
                  onClick={handleRefine}
                  disabled={refining || !isSystemOnline}
                  className="px-4 lg:px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-l disabled:opacity-50 transition-all group whitespace-nowrap"
                  style={{ color: '#60A5FA', borderColor: theme.colors.border, backgroundColor: theme.colors.paper }}
                 >
                   {refining ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} className="group-hover:scale-110 transition-transform" />}
                   {refining ? "AI Refining" : "Smart Refine"}
                 </button>
               </div>
               <div className="flex-1 p-4 lg:p-8 overflow-y-auto" style={{ backgroundColor: theme.colors.card }}>
                 {activeTab === 'builder' ? (
                   mode === AppMode.SINGLE ? (
                     <textarea value={singleText} onChange={(e) => setSingleText(e.target.value)} 
                       className="w-full h-full bg-transparent resize-none outline-none text-base lg:text-lg leading-relaxed font-light" 
                       style={{ color: theme.colors.text }}
                       placeholder="Nhập văn bản không giới hạn tại đây..." 
                     />
                   ) : (
                     <div className="space-y-4">
                        {dialogue.map((line, idx) => (
                          <div key={line.id} className="flex gap-2 lg:gap-4 items-start group animate-in slide-in-from-left-2 duration-300">
                            <select value={line.speakerId} onChange={(e) => {
                              const nd = [...dialogue];
                              nd[idx].speakerId = e.target.value;
                              setDialogue(nd);
                            }} className="w-20 lg:w-24 shrink-0 border text-[10px] font-black rounded-lg p-2 outline-none cursor-pointer"
                              style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.accent }}
                            >
                              {speakers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <textarea value={line.text} onChange={(e) => {
                              const nd = [...dialogue];
                              nd[idx].text = e.target.value;
                              setDialogue(nd);
                            }} className="flex-1 border rounded-xl p-3 text-sm outline-none resize-none min-h-[40px] transition-all"
                               style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }}
                             rows={1} />
                            <button onClick={() => setDialogue(dialogue.filter((_, i) => i !== idx))} className="mt-2 transition-colors" style={{ color: theme.colors.subText }}><Trash2 size={16} /></button>
                          </div>
                        ))}
                        <button onClick={() => setDialogue([...dialogue, { id: Date.now().toString(), speakerId: speakers[0].id, text: '' }])} 
                          className="w-full py-4 border-2 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all hover:border-opacity-100"
                          style={{ borderColor: theme.colors.border, color: theme.colors.subText }}
                        >+ Add New Voice Line</button>
                     </div>
                   )
                 ) : <pre className="text-xs font-mono leading-loose whitespace-pre-wrap" style={{ color: theme.colors.text }}>{mode === AppMode.SINGLE ? singleText : dialogue.map(l => `${speakers.find(s => s.id === l.speakerId)?.name}: ${l.text}`).join('\n')}</pre>}
               </div>
            </div>

            <button onClick={handleConvert} disabled={loading || !isSystemOnline || (isOverDailyLimit && !isAdmin)} 
              className={`w-full font-black py-4 lg:py-6 rounded-3xl flex items-center justify-center gap-2 lg:gap-4 shadow-xl transition-all disabled:opacity-50 disabled:grayscale group ${!isAdmin && isOverDailyLimit ? 'cursor-not-allowed opacity-70' : 'hover:scale-[1.01] active:scale-[0.98]'}`}
              style={{ backgroundColor: !isAdmin && isOverDailyLimit ? '#EF4444' : theme.colors.accent, color: theme.colors.bg }}
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (!isAdmin && isOverDailyLimit ? <Lock size={24} /> : <Play size={24} className="group-hover:translate-x-1 transition-transform" fill="currentColor" />)}
              <span className="text-sm lg:text-xl uppercase tracking-tighter text-center">
                {!isAdmin && isOverDailyLimit ? "QUÁ GIỚI HẠN 500K KÝ TỰ" : "KẾT XUẤT ÂM THANH (PHIÊN BẢN CỘNG ĐỒNG) 🚀"}
              </span>
            </button>
          </section>

          <section className="w-full lg:w-96 p-4 lg:p-6 flex flex-col space-y-4 lg:space-y-6 border-t lg:border-t-0 lg:border-l transition-colors duration-300 lg:overflow-y-auto" style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}>
             <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: theme.colors.subText }}>Output Management</label>
             <div className="min-h-[300px] lg:flex-1 rounded-[40px] border-2 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-8 shadow-inner relative overflow-hidden transition-colors duration-300"
               style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}
             >
                {!audioUrl && !loading && (
                  <div className="flex flex-col items-center justify-center space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
                      <img src={VN_FLAG_URL} alt="Vietnam Flag" className="relative w-48 lg:w-64 h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-lg" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: theme.colors.text }}>Ready for Community Render</p>
                         <div className="flex items-center justify-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-yellow-500"></span>
                            <p className="text-[10px] font-bold text-yellow-600">HOANG SA & TRUONG SA BELONG TO VIETNAM</p>
                            <span className="h-1 w-1 rounded-full bg-yellow-500"></span>
                         </div>
                    </div>
                  </div>
                )}
                
                {loading && (
                  <div className="space-y-6 flex flex-col items-center">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 rounded-full animate-spin" style={{ borderColor: theme.colors.highlight, borderTopColor: theme.colors.accent }}></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" size={32} style={{ color: theme.colors.accent }} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-black tracking-widest animate-pulse uppercase italic" style={{ color: theme.colors.accent }}>Processing Free Request...</p>
                      <p className="text-[10px] uppercase font-bold" style={{ color: theme.colors.subText }}>Applying Natural Pauses</p>
                    </div>
                  </div>
                )}

                {audioUrl && !loading && (
                  <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-xl border-4"
                      style={{ backgroundColor: theme.colors.accent, borderColor: theme.colors.bg }}
                    >
                      <Volume2 size={64} style={{ color: theme.colors.bg }} />
                    </div>
                    <div className="space-y-6">
                      <div className="inline-block px-4 py-1.5 text-[10px] font-black rounded-full border uppercase"
                        style={{ backgroundColor: theme.colors.highlight, color: theme.colors.accent, borderColor: theme.colors.highlight }}
                      >Community Build Ready</div>
                      <audio src={audioUrl} controls className="w-full h-10" style={{ accentColor: theme.colors.accent }} />
                      
                      <div className="relative">
                        <a 
                          href={audioUrl} 
                          onClick={(e) => {
                            if (!isAdmin && !isVietnameseIp) {
                              e.preventDefault();
                              startQuiz(audioUrl);
                            }
                          }}
                          download={`community_tts_${Date.now()}.wav`}
                          className="flex items-center justify-center gap-3 w-full py-5 font-black rounded-3xl text-xs transition-all shadow-xl uppercase tracking-widest hover:brightness-110 cursor-pointer"
                          style={{ backgroundColor: theme.colors.text, color: theme.colors.bg }}
                        >
                          <Download size={18} /> Download WAV
                        </a>
                      </div>
                    </div>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 gap-3">
               <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}>
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}><Zap size={16} className="text-blue-400" /></div>
                    <span className="text-[10px] uppercase font-black" style={{ color: theme.colors.subText }}>Latency</span>
                 </div>
                 <span className="text-xs font-mono font-bold text-blue-400">OPTIMIZED</span>
               </div>
               <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: theme.colors.paper, borderColor: theme.colors.border }}>
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}><ShieldCheck size={16} className="text-green-400" /></div>
                    <span className="text-[10px] uppercase font-black" style={{ color: theme.colors.subText }}>Access</span>
                 </div>
                 <span className="text-xs font-mono font-bold text-green-400">UNLIMITED</span>
               </div>
             </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;