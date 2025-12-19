
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceProfile, getGeminiVoice } from "../types";

export const decodeBase64Audio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint16(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);
  return new Blob([buffer], { type: 'audio/wav' });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry(fn: () => Promise<any>, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      await sleep(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Chia văn bản thành các đoạn nhỏ an toàn dựa trên dấu câu
 */
const chunkTextBySentence = (text: string, maxLength: number = 1000): string[] => {
  // Tách dựa trên dấu câu kết thúc câu, giữ lại dấu câu
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk);
  return chunks;
};

const concatenateBuffers = (buffers: Uint8Array[]): Uint8Array => {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
};

/**
 * THUẬT TOÁN NGẮT NGHỈ ĐA TẦNG (Multi-layered Pausing Algorithm)
 * Mô phỏng nhịp thở và nhịp điệu tự nhiên của con người.
 */
const applyMultiLayerPausing = (text: string): string => {
  // 1. Chuẩn hóa dấu câu
  let processed = text.replace(/([.,!?;:])/g, "$1 ");
  
  // 2. Tầng Biometric: Chèn điểm lấy hơi [breath] cho các câu dài
  const segments = processed.split(/(?<=[.!?])\s+/);
  processed = segments.map(s => {
    const wordCount = s.split(/\s+/).length;
    // Nếu câu quá dài, chèn lấy hơi ở giữa và đầu
    if (wordCount > 12) {
      return "[lấy hơi nhẹ] " + s.replace(/, /g, ", [nghỉ ngắn] ");
    }
    return s;
  }).join(" ");

  // 3. Tầng Semantic: Chèn micro-pauses tại các từ nối quan trọng
  const connectors = ["tuy nhiên", "nhưng mà", "vì thế", "đặc biệt", "hơn nữa", "ngoài ra"];
  connectors.forEach(conn => {
    const regex = new RegExp(`(\\s)(${conn})(\\s)`, "gi");
    processed = processed.replace(regex, "$1... $2 $3");
  });

  // 4. Kết thúc đoạn: Tạo khoảng lặng cảm xúc
  processed = processed.replace(/\n/g, "... \n");

  return processed;
};

const buildHumanLikePersonaPrompt = (profile: VoiceProfile, speed: number): string => {
  const { gender, region, age, pitch, intonation } = profile;
  const speedText = speed !== 1.0 ? ` Tốc độ đọc: ${speed}x.` : "";
  
  return `BẠN LÀ NGHỆ SĨ LỒNG TIẾNG CHUYÊN NGHIỆP CÓ LINH HỒN.
THÔNG TIN: Giới tính ${gender}, Vùng miền ${region}, Độ tuổi ${age}, Tông giọng ${pitch}.
PHONG CÁCH: ${intonation}.

QUY TẮC VÀNG ĐỂ GIỐNG NGƯỜI THẬT 99%:
- BIỂU CẢM: Phải thể hiện được cảm xúc qua giọng nói, không đọc như robot.
- NHỊP THỞ: Thể hiện tiếng lấy hơi nhẹ khi gặp chỉ dẫn [lấy hơi].
- NHẤN NHÁ: Nhấn vào các từ khóa quan trọng mang tính cảm xúc.
- NGẮT NGHỈ: Sử dụng dấu "..." để tạo khoảng nghỉ suy tư. Dấu phẩy nghỉ vừa, dấu chấm nghỉ dài hơn để lấy hơi.
- BIẾN THIÊN: Giọng nói có lúc nhanh lúc chậm tùy theo nội dung.${speedText}`;
};

/**
 * Sử dụng Gemini 3 Pro để tinh chỉnh văn bản cho tự nhiên hơn trước khi TTS
 */
export const refineText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Bạn là một chuyên gia biên kịch và đạo diễn lồng tiếng. Hãy viết lại đoạn văn bản sau để khi đọc lên bằng giọng AI nghe sẽ tự nhiên, giàu cảm xúc và có nhịp điệu như người thật nói chuyện nhất.
    
Yêu cầu:
1. Giữ nguyên nội dung và thông điệp.
2. Làm cho câu văn mượt mà hơn, phù hợp với văn phong nói.
3. Chỉ trả về văn bản đã tinh chỉnh, không thêm bất kỳ chú thích nào khác.

Văn bản: ${text}`,
  });
  return response.text || text;
};

export const generateSpeech = async (
  prompt: string, 
  profile: VoiceProfile,
  speed: number = 1.0
): Promise<Uint8Array | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const persona = buildHumanLikePersonaPrompt(profile, speed);
  const voiceName = getGeminiVoice(profile);
  
  // Chia nhỏ văn bản để gửi tuần tự (Unlimited Text Support)
  const chunks = chunkTextBySentence(prompt, 1500);
  const audioBuffers: Uint8Array[] = [];

  for (const chunk of chunks) {
    // Áp dụng thuật toán ngắt nghỉ cho từng đoạn
    const optimizedText = applyMultiLayerPausing(chunk);

    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${persona}\n\nKịch bản: ${optimizedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }));

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      audioBuffers.push(decodeBase64Audio(base64));
    }
  }

  if (audioBuffers.length === 0) return undefined;
  return concatenateBuffers(audioBuffers);
};

export const generateDialogue = async (
  lines: { speakerName: string, profile: VoiceProfile, text: string }[]
): Promise<Uint8Array | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Lấy danh sách nhân vật duy nhất
  const uniqueSpeakers = Array.from(new Map(lines.map(l => [l.speakerName, l.profile])).entries());
  
  const speakerVoiceConfigs = uniqueSpeakers.slice(0, 2).map(([name, profile]) => ({
    speaker: name,
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: getGeminiVoice(profile) }
    }
  }));

  const charSettings = uniqueSpeakers.map(([name, profile]) => 
    `- ${name}: Giọng ${profile.gender} ${profile.region}, phong cách ${profile.intonation}.`
  ).join('\n');

  // Chia nhỏ hội thoại theo từng lô (Batch processing) nếu quá dài
  const BATCH_SIZE = 20; // Số dòng thoại mỗi lần xử lý
  const audioBuffers: Uint8Array[] = [];

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batchLines = lines.slice(i, i + BATCH_SIZE);
    
    // Tối ưu hóa từng dòng thoại trong batch
    const conversationText = batchLines.map(l => `${l.speakerName}: ${applyMultiLayerPausing(l.text)}`).join('\n');

    const prompt = `THỰC HIỆN HỘI THOẠI ĐA NHÂN VẬT - GIẢ LẬP NHỊP SỐNG THỰC (Phần ${i/BATCH_SIZE + 1}).
NHÂN VẬT:
${charSettings}

YÊU CẦU:
- Các nhân vật tương tác tự nhiên.
- Duy trì mạch cảm xúc của câu chuyện.

KỊCH BẢN:
${conversationText}`;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerVoiceConfigs
          }
        }
      }
    }));

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      audioBuffers.push(decodeBase64Audio(base64));
    }
  }

  if (audioBuffers.length === 0) return undefined;
  return concatenateBuffers(audioBuffers);
};
