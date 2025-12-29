
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with the API key from environment
export async function translateText(
  text: string, 
  targetLang: string, 
  sourceLang: string = 'auto',
  tone: string = 'Neutral'
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Translate the following text into ${targetLang}. 
  The desired tone is ${tone}.
  Original language context: ${sourceLang === 'auto' ? 'Detect automatically' : sourceLang}.
  
  Text to translate:
  "${text}"
  
  Return only the translated text, no explanations or additional content.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return `Translation failed. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Detect the ISO language code (e.g., 'en', 'es', 'fr', 'zh') for the following text. 
  Return ONLY the language code.
  
  Text: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text?.trim().toLowerCase() || 'en';
  } catch (error) {
    console.error("Gemini Detection Error:", error);
    return 'en';
  }
}

export function speakText(text: string, lang: string = 'en-US'): void {
  if (!text) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
}
