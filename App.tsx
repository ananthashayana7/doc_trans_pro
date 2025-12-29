
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  SUPPORTED_LANGUAGES, 
  TranslationHistoryItem 
} from './types.ts';
import { translateText, detectLanguage, speakText } from './services/aiService.ts';
import { 
  ArrowRightLeft, 
  Volume2, 
  Copy, 
  History as HistoryIcon, 
  Check, 
  Loader2,
  Sparkles,
  ChevronRight,
  PenTool,
  FileUp,
  Search,
  Globe,
  Mic,
  MicOff
} from 'lucide-react';
import * as mammoth from 'mammoth';

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [tone, setTone] = useState('Neutral');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  
  // Browser Speech Recognition
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('doctrans_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }

    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSourceText(prev => (prev.endsWith(' ') || prev === '' ? prev + transcript : prev + ' ' + transcript));
      };

      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('doctrans_history', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const stats = useMemo(() => {
    const words = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
    return { words };
  }, [sourceText]);

  const detectedLangName = useMemo(() => {
    if (!detectedLang) return null;
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === detectedLang.toLowerCase());
    return lang ? lang.name : detectedLang.toUpperCase();
  }, [detectedLang]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      setDetectedLang(null);
      return;
    }

    setIsTranslating(true);
    try {
      let actualSourceLang = sourceLang;
      if (sourceLang === 'auto') {
        const detected = await detectLanguage(sourceText);
        setDetectedLang(detected);
        actualSourceLang = detected;
      } else {
        setDetectedLang(null);
      }

      const result = await translateText(sourceText, targetLang, actualSourceLang, tone);
      setTranslatedText(result);

      const newHistoryItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        sourceText,
        translatedText: result,
        sourceLang: actualSourceLang,
        targetLang,
        timestamp: Date.now(),
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    } catch (error) {
      console.error("Translation Error:", error);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, tone]);

  // Auto-translate debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.length > 5 && !isRecording && !isProcessingFile) {
        handleTranslate();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [sourceText, targetLang, tone, isRecording, isProcessingFile, handleTranslate]);

  const swap = () => {
    const oldSource = sourceText;
    const oldTrans = translatedText;
    const oldS = sourceLang === 'auto' ? detectedLang || 'en' : sourceLang;
    const oldT = targetLang;
    
    setSourceLang(oldT);
    setTargetLang(oldS);
    setSourceText(oldTrans);
    setTranslatedText(oldSource);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'txt') {
        const text = await file.text();
        setSourceText(text);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        // @ts-ignore
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(result.value);
      }
    } catch (err) {
      console.error("File error:", err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported in this browser.");
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-indigo-100 shadow-lg">D</div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">Doc Trans <span className="text-indigo-600">Local</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}><HistoryIcon size={20} /></button>
          <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">OFF</div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-4 lg:p-8 gap-8">
        <div className="flex-1 flex flex-col gap-6">
          <div className="glass-panel pro-shadow rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100/60 p-1 rounded-xl relative">
              <div className="flex items-center">
                <select 
                  value={sourceLang} 
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="auto">Auto Detect</option>
                  {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                
                {sourceLang === 'auto' && detectedLangName && (
                  <div className="ml-1 animate-in flex items-center gap-1.5 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-indigo-200 whitespace-nowrap">
                    <Search size={10} className="stroke-[3px]" />
                    <span>{detectedLangName}</span>
                  </div>
                )}
              </div>
              
              <button onClick={swap} className="mx-1 p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm"><ArrowRightLeft size={16} /></button>
              
              <select 
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100/60 p-1 rounded-xl">
              <PenTool size={14} className="text-slate-400 ml-2" />
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none cursor-pointer">
                <option>Neutral</option><option>Formal</option><option>Casual</option><option>Technical</option>
              </select>
            </div>

            <div className="ml-auto flex gap-2">
              {isTranslating && (
                <div className="flex items-center gap-2 text-indigo-500 text-[10px] font-bold bg-indigo-50 px-3 py-1.5 rounded-full animate-pulse border border-indigo-100">
                  <Loader2 size={12} className="animate-spin" /> LOCAL ENGINE
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
            <div className="flex flex-col glass-panel pro-shadow rounded-3xl overflow-hidden group">
              <div className="bg-white/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={12} /> Input</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">{stats.words} words</span>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg transition-colors uppercase"><FileUp size={12} /> Import</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={handleFileUpload} />
                </div>
              </div>
              <textarea
                value={sourceText} onChange={(e) => setSourceText(e.target.value)}
                placeholder="Start typing or paste document..."
                className="flex-1 p-8 doc-editor resize-none outline-none text-slate-700 leading-relaxed text-lg"
              />
              <div className="p-4 bg-white/40 border-t border-slate-100 flex gap-2">
                <button onClick={() => speakText(sourceText)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Listen"><Volume2 size={20} /></button>
                <button 
                  onClick={toggleRecording} 
                  className={`p-2 rounded-xl transition-all ${isRecording ? 'text-red-600 bg-red-50 shadow-inner animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title={isRecording ? "Stop Listening" : "Start Voice Input"}
                >
                  <Mic size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col glass-panel pro-shadow rounded-3xl overflow-hidden bg-slate-900/5">
              <div className="bg-indigo-600/5 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Sparkles size={12} /> Translation</span>
                <div className="flex items-center gap-2">
                   <div className="px-2 py-0.5 bg-indigo-100/50 text-indigo-600 text-[9px] font-black rounded-md uppercase tracking-tighter">Native Core 1.0</div>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-auto text-slate-800 leading-relaxed text-lg whitespace-pre-wrap">
                {translatedText || <span className="text-slate-300 italic">Translation will appear here...</span>}
              </div>
              <div className="p-4 bg-white/40 border-t border-slate-100 flex gap-2">
                <button onClick={() => speakText(translatedText, targetLang)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" disabled={!translatedText}><Volume2 size={20} /></button>
                <button onClick={() => { navigator.clipboard.writeText(translatedText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`p-2 rounded-xl transition-all ${copied ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} disabled={!translatedText}>{copied ? <Check size={20} /> : <Copy size={20} />}</button>
                <button onClick={handleTranslate} className="ml-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95">
                  Process Now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="h-10 border-t border-slate-100 flex items-center justify-center bg-white/50 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Private & Secure • Local Browser Engine
      </footer>
    </div>
  );
};

export default App;
