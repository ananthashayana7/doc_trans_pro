
import { GoogleGenAI, Modality } from "@google/genai";

// Ensure we initialize exactly as required by the docs
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function translateText(
  text: string, 
  targetLang: string, 
  sourceLang: string = 'auto',
  tone: string = 'Neutral'
): Promise<string> {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  const prompt = `Translate the following text to ${targetLang}. 
  Source Language: ${sourceLang === 'auto' ? 'detect automatically' : sourceLang}
  Tone: ${tone}
  
  Only return the translated string. Do not include any meta-commentary.
  
  Text: "${text}"`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.1,
    }
  });

  return response.text || '';
}

export async function detectLanguage(text: string): Promise<string> {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  const prompt = `Identify the 2-letter ISO language code for this text. Only return the code (e.g., 'en', 'fr').
  
  Text: "${text}"`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim().toLowerCase() || 'en';
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function speakText(text: string, voiceName: string = 'Kore'): Promise<void> {
  if (!text) return;
  const ai = getAI();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1,
    );
    
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.start();
  } catch (error) {
    console.error("TTS Error:", error);
  }
}
