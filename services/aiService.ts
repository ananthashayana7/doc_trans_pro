
export async function translateText(
  text: string, 
  targetLang: string, 
  sourceLang: string = 'auto',
  tone: string = 'Neutral'
): Promise<string> {
  // Simulate network delay for realistic UI feedback
  await new Promise(r => setTimeout(r, 800));
  
  // NOTE: True client-side translation requires heavy models like Transformers.js.
  // For local testing/keyless operation, we use a simulation that indicates the target language.
  // To restore real translation, you would use an API or a WASM model.
  return `[${targetLang.toUpperCase()} - ${tone}] ${text}`;
}

export async function detectLanguage(text: string): Promise<string> {
  // Simple heuristic for demo purposes
  if (!text) return 'en';
  const commonWords: Record<string, string[]> = {
    'es': ['hola', 'que', 'como', 'gracias'],
    'fr': ['bonjour', 'merci', 'oui', 'non'],
    'de': ['hallo', 'danke', 'ja', 'nein']
  };

  for (const [code, words] of Object.entries(commonWords)) {
    if (words.some(word => text.toLowerCase().includes(word))) return code;
  }
  return 'en';
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
