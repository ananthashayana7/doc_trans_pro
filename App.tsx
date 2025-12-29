
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  SUPPORTED_LANGUAGES, 
  TranslationHistoryItem 
} from './types';
import { translateText, detectLanguage, speakText } from './services/geminiService';
import { 
  ArrowRightLeft, 
  Volume2, 
  Copy, 
  History as HistoryIcon, 
  Trash2, 
  Check, 
  FileText,
  Mic,
  Loader2,
  Sparkles,
  Settings,
  ChevronRight,
  Clock,
  Languages,
  PenTool
} from 'lucide-react';

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [tone, setTone] = useState('Neutral');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('doctrans_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('doctrans_history', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const stats = useMemo(() => {
    const words = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
    const readingTime = Math.ceil(words / 200);
    return { words, readingTime };
  }, [sourceText]);

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
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, tone]);

  // Debounced translation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.length > 5) handleTranslate();
    }, 1200);
    return () => clearTimeout(timer);
  }, [sourceText, targetLang, tone]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-indigo-100 shadow-lg">
            D
          </div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">Doc Trans <span className="text-indigo-600">Pro</span></span>
          <div className="ml-4 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Linguist Engine 3.1</div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            <HistoryIcon size={20} />
          </button>
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
            <Settings size={20} />
          </button>
          <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-4 lg:p-8 gap-8">
        
        {/* Workspace */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Controls Panel */}
          <div className="glass-panel pro-shadow rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl">
              <select 
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none"
              >
                <option value="auto">Auto Detect</option>
                {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <button onClick={swap} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm">
                <ArrowRightLeft size={16} />
              </button>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none"
              >
                {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            <div className="h-6 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl">
              <PenTool size={14} className="text-slate-400 ml-2" />
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none"
              >
                <option>Neutral</option>
                <option>Formal</option>
                <option>Casual</option>
                <option>Technical</option>
              </select>
            </div>

            {isTranslating && (
              <div className="ml-auto flex items-center gap-2 text-indigo-500 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                AI PROCESSING
              </div>
            )}
          </div>

          {/* Document Panes */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
            {/* Source Pane */}
            <div className="flex flex-col glass-panel pro-shadow rounded-3xl overflow-hidden border-2 border-transparent focus-within:border-indigo-100 transition-all">
              <div className="bg-white/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Source Document</span>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                    <FileText size={12} /> {stats.words} Words
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                    <Clock size={12} /> {stats.readingTime}m Read
                  </div>
                </div>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste document text or type here..."
                className="flex-1 p-8 doc-editor resize-none outline-none text-slate-700 leading-relaxed text-lg"
              />
              <div className="p-4 bg-white/50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => speakText(sourceText)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Volume2 size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                  <Mic size={20} />
                </button>
              </div>
            </div>

            {/* Translation Pane */}
            <div className="flex flex-col glass-panel pro-shadow rounded-3xl overflow-hidden bg-slate-900/5">
              <div className="bg-indigo-600/5 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} /> AI Translation
                </span>
                <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded uppercase">
                  {tone}
                </div>
              </div>
              <div className="flex-1 p-8 overflow-auto text-slate-800 leading-relaxed text-lg">
                {translatedText || <span className="text-slate-300 italic">Waiting for input...</span>}
              </div>
              <div className="p-4 bg-white/50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => speakText(translatedText)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  disabled={!translatedText}
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(translatedText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`p-2 rounded-xl transition-all ${copied ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  disabled={!translatedText}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
                <button 
                  onClick={handleTranslate}
                  className="ml-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  Translate Now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar History */}
        {showHistory && (
          <aside className="w-full lg:w-80 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
            <div className="glass-panel pro-shadow rounded-3xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Clock size={18} className="text-indigo-600" /> Archive
                </h3>
                <button 
                  onClick={() => setHistory([])}
                  className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-center py-20 opacity-30">
                    <Languages size={40} className="mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">Empty</p>
                  </div>
                ) : (
                  history.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setSourceText(item.sourceText);
                        setTranslatedText(item.translatedText);
                      }}
                      className="p-4 bg-white hover:bg-indigo-50 border border-slate-100 rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase">{item.sourceLang} → {item.targetLang}</span>
                        <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 font-medium">{item.sourceText}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      <footer className="p-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        Linguistics Engine 3.1 &bull; Powered by Google Gemini &bull; Ready for Export
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .animate-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
