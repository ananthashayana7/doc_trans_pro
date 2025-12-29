export async function translateText(text, targetLang, sourceLang = 'auto', tone = 'Neutral') {
  await new Promise(r => setTimeout(r, 600));
  return `[${targetLang.toUpperCase()} - ${tone}] ${text}`;
}

export async function detectLanguage(text) {
  return 'en';
}

export function speakText(text, lang = 'en-US') {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}