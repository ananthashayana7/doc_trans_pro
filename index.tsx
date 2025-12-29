import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Languages, ArrowRightLeft, Volume2, Copy, Check, Loader2, 
  Mic, FileUp, Sparkles, History, Trash2, ChevronRight, 
  Settings2, Download, Search, Globe 
} from 'lucide-react';
import * as mammoth from 'mammoth';

// --- Configuration ---
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

const TONES = ['Neutral', 'Professional', 'Casual', 'Academic', 'Creative'];

// --- Main App Component ---
const App = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [tone, setTone] = useState('Neutral');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLangName, setDetectedLangName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setSourceText(prev => prev + transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Task: Translate the text below.
        Target Language: ${targetLang}
        Tone: ${tone}
        Source Language Hint: ${sourceLang === 'auto' ? 'Detect automatically' : sourceLang}
        
        Text to translate:
        "${sourceText}"
        
        Return ONLY the translated text. Do not include quotes, preamble, or explanations.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const result = response.text || '';
      setTranslatedText(result.trim());
      
      if (sourceLang === 'auto') {
          setDetectedLangName('Detected'); // Simple UI feedback
      }
    } catch (error) {
      console.error("AI Error:", error);
      setTranslatedText("Error: Translation engine unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'txt') {
        const text = await file.text();
        setSourceText(text);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(result.value);
      }
    } catch (err) {
      console.error("File Error:", err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const speak = (text: string, lang: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapLanguages = () => {
    if (sourceLang === 'auto') return;
    const s = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(s);
    const textS = sourceText;
    setSourceText(translatedText);
    setTranslatedText(textS);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Languages className="text-white" size={24} />
          </div>
          <div>
            <h1 className="brand-font text-xl text-slate-900 tracking-tight font-extrabold">TransPro <span className="text-indigo-600">AI</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Powered by Gemini 3 Flash</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"><History size={20}/></button>
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"><Settings2 size={20}/></button>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">
             LIVE
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Controls Bar */}
        <div className="glass p-4 rounded-3xl flex flex-wrap items-center gap-6 shadow-sm border border-white/50">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
            <select 
              value={sourceLang} 
              onChange={e => setSourceLang(e.target.value)}
              className="bg-transparent text-sm font-bold px-3 py-1 outline-none cursor-pointer text-slate-700"
            >
              <option value="auto">Detect Language</option>
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            
            <button 
              onClick={swapLanguages}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
              disabled={sourceLang === 'auto'}
            >
              <ArrowRightLeft size={16} />
            </button>

            <select 
              value={targetLang} 
              onChange={e => setTargetLang(e.target.value)}
              className="bg-transparent text-sm font-bold px-3 py-1 outline-none cursor-pointer text-slate-700"
            >
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-tighter">Tone</span>
            <select 
              value={tone} 
              onChange={e => setTone(e.target.value)}
              className="bg-transparent text-sm font-bold px-3 py-1 outline-none cursor-pointer text-slate-700"
            >
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all ml-auto shadow-sm shadow-slate-200/50"
          >
            <FileUp size={18} className="text-indigo-600" /> Upload File
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={handleFileUpload} />
        </div>

        {/* Translation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[500px]">
          {/* Source Panel */}
          <div className="flex flex-col bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Globe size={14} className="text-indigo-400" /> Source Content
                {detectedLangName && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[9px]">{detectedLangName}</span>}
              </span>
              <button onClick={() => setSourceText('')} className="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={18}/></button>
            </div>
            <textarea 
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="Paste text, type, or upload a document to begin..."
              className="flex-1 p-8 text-xl text-slate-700 leading-relaxed outline-none resize-none editor-grid placeholder:text-slate-200"
            />
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => speak(sourceText, sourceLang)}
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm"
                  disabled={!sourceText}
                >
                  <Volume2 size={22} />
                </button>
                <button 
                  onClick={toggleRecording}
                  className={`p-3 rounded-2xl transition-all shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}
                >
                  <Mic size={22} />
                </button>
              </div>
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{sourceText.length} Characters</div>
            </div>
          </div>

          {/* Target Panel */}
          <div className="flex flex-col bg-slate-900 rounded-[2rem] shadow-2xl shadow-indigo-900/20 overflow-hidden relative">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" /> AI Translation Engine
              </span>
              {loading && <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black animate-pulse tracking-widest">
                <Loader2 size={14} className="animate-spin" /> ANALYZING...
              </div>}
            </div>
            <div className={`flex-1 p-8 text-xl text-indigo-50/90 leading-relaxed whitespace-pre-wrap overflow-y-auto ${loading ? 'opacity-40 blur-[1px]' : 'opacity-100'} transition-all duration-300`}>
              {translatedText || (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                  <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-600 shadow-inner">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-slate-500 italic text-base">Instant AI translation will appear here after you process the source content.</p>
                </div>
              )}
            </div>
            <div className="p-5 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => speak(translatedText, targetLang)}
                  className="p-3 text-slate-500 hover:text-indigo-300 hover:bg-slate-800 rounded-2xl transition-all"
                  disabled={!translatedText}
                >
                  <Volume2 size={22} />
                </button>
                <button 
                  onClick={copyToClipboard}
                  className={`p-3 rounded-2xl transition-all ${copied ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-indigo-300 hover:bg-slate-800'}`}
                  disabled={!translatedText}
                >
                  {copied ? <Check size={22} /> : <Copy size={22} />}
                </button>
                <button 
                  className="p-3 text-slate-500 hover:text-indigo-300 hover:bg-slate-800 rounded-2xl transition-all"
                  disabled={!translatedText}
                >
                  <Download size={22} />
                </button>
              </div>
              <button 
                onClick={handleTranslate}
                disabled={loading || !sourceText}
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
              >
                TRANSLATE <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t bg-white flex items-center justify-center gap-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Universal Knowledge Access • Enterprise Privacy • Powered by Gemini 3</p>
      </footer>
    </div>
  );
};

// --- Execution ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);