
export enum AppMode {
  SINGLE = 'Single',
  DIALOGUE = 'Dialogue'
}

export type Gender = 'Nam' | 'Nữ';
export type Region = 'Miền Bắc (Hà Nội)' | 'Miền Nam (Sài Gòn)' | 'Miền Trung (Huế/Đà Nẵng)' | 'Chuẩn (Trung lập)';
export type Age = 'Trẻ em' | 'Thanh niên' | 'Trung niên' | 'Người già';
export type Pitch = 'Trầm' | 'Trung bình' | 'Cao';
export type Intonation = 'Tự nhiên' | 'Vui vẻ' | 'Trầm buồn' | 'Trang trọng' | 'Kịch tính' | 'Hào hứng';
export type BaseVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Leda' | 'Aoede';

export interface VoiceProfile {
  gender: Gender;
  region: Region;
  age: Age;
  pitch: Pitch;
  intonation: Intonation;
  baseVoice: BaseVoice;
}

export interface Speaker {
  id: string;
  name: string;
  profile: VoiceProfile;
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  text: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;       // Nền chính
    paper: string;    // Nền Sidebar/Header
    card: string;     // Nền card/input
    text: string;     // Chữ chính
    subText: string;  // Chữ phụ
    accent: string;   // Màu nhấn (Icon, Button chính)
    border: string;   // Viền
    highlight: string;// Màu nền nhạt cho active state
  }
}

// Map attributes to specific Gemini voices if users want auto-selection, 
// but we'll prioritize the direct baseVoice selection now.
export const getGeminiVoice = (profile: VoiceProfile): string => {
  return profile.baseVoice;
};
