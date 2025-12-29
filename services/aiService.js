
import { GoogleGenAI } from "@google/genai";

// Use Gemini 3 Flash for efficient text processing and translations
export async function translateText(text, targetLang, sourceLang = 'auto', tone = 'Neutral') {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Translate the following text into ${targetLang}. 
  Tone: ${tone}.
  Source Language Context: ${sourceLang}.
  
  Text: "${text}"
  
  Return ONLY the translated string.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return "Error during translation.";
  }
}

export async function detectLanguage(text) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Identify the language of this text. Return only the 2-letter ISO code.
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

export function speakText(text, lang = 'en-US') {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
