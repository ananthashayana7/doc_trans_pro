
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Languages, ArrowRightLeft, Volume2, Copy, Check, Loader2, 
  Mic, FileUp, Sparkles, Trash2, ChevronRight, Globe, AlertCircle 
} from 'lucide-react';
import * as mammoth from 'mammoth';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' }
];

const TONES = [
  { name: 'Neutral', prompt: 'Use a clear, standard tone.' },
  { name: 'Professional', prompt: 'Use a formal, business-appropriate tone.' },
  { name: 'Casual', prompt: 'Use a friendly, conversational tone.' },
  { name: 'Academic', prompt: 'Use a precise, scholarly tone.' },
  { name: 'Creative', prompt: 'Use an expressive and imaginative tone.' }
];

const App = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [tone, setTone] = useState('Neutral');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Pure JS way to access SpeechRecognition properties
    // Added cast to any to resolve TypeScript 'Property does not exist on type Window' errors for experimental/prefixed APIs
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setSourceText(prev => prev + transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const selectedTone = TONES.find(t => t.name === tone) || TONES[0];
      const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'the target language';
      
      const prompt = `Translate this text into ${targetLangName}.
      Tone: ${selectedTone.prompt}
      Important: Return ONLY the translated string. Do not repeat the input or add notes.
      
      Input: "${sourceText}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const outputText = response.text || '';
      if (!outputText) throw new Error("Translation failed");
      setTranslatedText(outputText.trim());
    } catch (err) {
      console.error(err);
      setError("AI Translation error. Check your API key or connection.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        alert("Speech input not available in this browser.");
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    setError('');

    try {
      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(result.value || '');
      } else if (extension === 'txt') {
        setSourceText(await file.text());
      } else {
        setError("Please use .txt or .docx files.");
      }
    } catch (err) { 
      setError("Error reading file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const speak = (text, langCode) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Languages className="text-white" size={24} />
          </div>
          <h1 className="brand-font text-xl text-slate-900 font-extrabold">TransPro <span className="text-indigo-600">AI</span></h1>
        </div>
        <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Active Engine</span>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-6">
        <div className="glass p-4 rounded-3xl flex flex-wrap items-center gap-4 shadow-sm border border-white">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border">
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="bg-transparent text-sm font-bold px-3 py-1 outline-none cursor-pointer">
              <option value="auto">Auto Detect</option>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <div className="px-1 text-slate-300"><ArrowRightLeft size={14}/></div>
            <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="bg-transparent text-sm font-bold px-3 py-1 outline-none cursor-pointer">
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <select value={tone} onChange={e => setTone(e.target.value)} className="bg-slate-100 text-sm font-bold px-4 py-2 rounded-2xl outline-none cursor-pointer">
            {TONES.map(t => <option key={t.name} value={t.name}>{t.name} Tone</option>)}
          </select>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-white border rounded-2xl text-sm font-bold ml-auto hover:bg-slate-50 transition-all shadow-sm">
            <FileUp size={18} className="text-indigo-600" /> Import Document
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={handleFileUpload} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          <div className="flex flex-col bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden min-h-[450px]">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Source</span>
              <button onClick={() => { setSourceText(''); setTranslatedText(''); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
            </div>
            <textarea 
              value={sourceText} 
              onChange={e => setSourceText(e.target.value)} 
              placeholder="Paste text or import a document..." 
              className="flex-1 p-8 text-xl text-slate-700 outline-none resize-none editor-grid leading-relaxed"
            />
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => speak(sourceText, sourceLang)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 transition-colors" disabled={!sourceText}><Volume2 size={22}/></button>
              <button onClick={toggleRecording} className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}>
                <Mic size={22}/>
              </button>
            </div>
          </div>

          <div className="flex flex-col bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden min-h-[450px]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} className="text-indigo-400"/> Translation</span>
              {loading && <Loader2 size={18} className="text-indigo-400 animate-spin"/>}
            </div>
            <div className="flex-1 p-8 text-xl text-indigo-50 leading-relaxed whitespace-pre-wrap overflow-y-auto break-words font-medium">
              {translatedText || <p className="text-slate-700 italic font-normal">Waiting for input...</p>}
            </div>
            <div className="p-5 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => speak(translatedText, targetLang)} className="p-3 bg-slate-800 text-slate-500 rounded-2xl hover:text-indigo-300 transition-colors" disabled={!translatedText}><Volume2 size={22}/></button>
                <button onClick={() => { navigator.clipboard.writeText(translatedText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-800 text-slate-500 rounded-2xl hover:text-indigo-300 transition-colors" disabled={!translatedText}>
                  {copied ? <Check size={22} className="text-green-400" /> : <Copy size={22} />}
                </button>
              </div>
              <button 
                onClick={handleTranslate} 
                disabled={loading || !sourceText} 
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-2xl shadow-xl flex items-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'PROCESSING...' : 'TRANSLATE'} <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
      <footer className="p-4 text-center border-t bg-white">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest tracking-widest">Enterprise Doc Trans Pro • Secure Browser Session</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
