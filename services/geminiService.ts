
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function translateText(
  text: string, 
  targetLang: string, 
  sourceLang: string = 'auto'
): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Translate the following text from ${sourceLang === 'auto' ? 'detecting the language' : sourceLang} to ${targetLang}. 
  Provide only the translated text, no extra commentary or context.
  
  Text: "${text}"`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.1, // Low temperature for factual translation accuracy
    }
  });

  return response.text || '';
}

export async function detectLanguage(text: string): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const prompt = `Identify the ISO language code for the following text. Return ONLY the 2-letter code (e.g., 'en', 'fr', 'es').
  
  Text: "${text}"`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim().toLowerCase() || 'en';
}

// Audio decoding helper functions
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
