
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SUPPORTED_LANGUAGES, 
  Language, 
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
  Languages,
  Mic,
  Loader2,
  Sparkles
} from 'lucide-react';

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  // Auto-save history to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('translation_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('translation_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      setDetectedLang(null);
      return;
    }

    setIsTranslating(true);
    try {
      let actualSourceLang = sourceLang;
      
      // If auto, detect language first
      if (sourceLang === 'auto') {
        const detected = await detectLanguage(sourceText);
        setDetectedLang(detected);
        actualSourceLang = detected;
      } else {
        setDetectedLang(null);
      }

      const result = await translateText(sourceText, targetLang, actualSourceLang);
      setTranslatedText(result);

      // Add to history
      const newHistoryItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        sourceText,
        translatedText: result,
        sourceLang: actualSourceLang,
        targetLang,
        timestamp: Date.now(),
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
    } catch (error) {
      console.error("Translation error", error);
      alert("Something went wrong with the translation. Please check your API configuration.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang]);

  // Debounce translation for better UX
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sourceText.length > 3) {
        handleTranslate();
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [sourceText, targetLang, sourceLang]);

  const swapLanguages = () => {
    if (sourceLang === 'auto' && detectedLang) {
      setSourceLang(targetLang);
      setTargetLang(detectedLang);
    } else if (sourceLang !== 'auto') {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = (text: string, lang: string) => {
    // Choose voice based on language or generic
    const voice = lang === 'en' ? 'Puck' : 'Kore';
    speakText(text, voice);
  };

  const clearHistory = () => {
    if (window.confirm("Clear all translation history?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Languages size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Gemini <span className="text-blue-600">Ultra</span> Translator
          </h1>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${showHistory ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          <HistoryIcon size={18} />
          <span className="hidden sm:inline font-medium">History</span>
        </button>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Translation Box */}
        <div className={`col-span-12 ${showHistory ? 'lg:col-span-8' : ''} space-y-6 transition-all duration-300`}>
          
          {/* Controls Bar */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
            <select 
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="bg-slate-50 border-none text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]"
            >
              <option value="auto">Detect Language</option>
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>

            <button 
              onClick={swapLanguages}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="Swap Languages"
            >
              <ArrowRightLeft size={20} />
            </button>

            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-50 border-none text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
               {isTranslating && (
                 <div className="flex items-center gap-2 text-blue-500 text-xs font-medium animate-pulse">
                   <Loader2 size={14} className="animate-spin" />
                   Translating...
                 </div>
               )}
            </div>
          </div>

          {/* Text Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input */}
            <div className="relative group">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Type text to translate..."
                className="w-full h-64 p-6 bg-white border border-slate-200 rounded-3xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg text-slate-700 shadow-sm transition-all"
              />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <button 
                  onClick={() => handleSpeech(sourceText, sourceLang)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  disabled={!sourceText}
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Voice Input (Coming Soon)"
                >
                  <Mic size={20} />
                </button>
              </div>
              <div className="absolute bottom-4 right-4 text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                {detectedLang && sourceLang === 'auto' ? `Detected: ${SUPPORTED_LANGUAGES.find(l => l.code === detectedLang)?.name || detectedLang.toUpperCase()}` : ''}
              </div>
            </div>

            {/* Output */}
            <div className="relative">
              <div className={`w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-lg text-slate-800 shadow-inner overflow-auto ${!translatedText && 'flex items-center justify-center'}`}>
                {translatedText ? (
                  translatedText
                ) : (
                  <span className="text-slate-400 italic">Translation will appear here...</span>
                )}
              </div>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <button 
                  onClick={() => handleSpeech(translatedText, targetLang)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  disabled={!translatedText}
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={copyToClipboard}
                  className={`p-2 rounded-xl transition-all ${copied ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                  disabled={!translatedText}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <div className="absolute top-4 right-4">
                 <Sparkles size={16} className="text-blue-300" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isTranslating ? (
              <>
                <Loader2 className="animate-spin" />
                Working...
              </>
            ) : (
              'Translate'
            )}
          </button>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <aside className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col max-h-[700px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HistoryIcon size={20} className="text-blue-600" />
                Recent
              </h2>
              <button 
                onClick={clearHistory}
                className="text-slate-400 hover:text-red-600 p-2 transition-colors"
                title="Clear All"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <HistoryIcon size={24} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm">No recent translations</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-white transition-all cursor-pointer group"
                    onClick={() => {
                      setSourceText(item.sourceText);
                      setTranslatedText(item.translatedText);
                      setSourceLang(item.sourceLang);
                      setTargetLang(item.targetLang);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {item.sourceLang} → {item.targetLang}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium line-clamp-2 mb-1">{item.sourceText}</p>
                    <p className="text-sm text-slate-500 line-clamp-2">{item.translatedText}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-12 text-slate-400 text-sm flex items-center gap-2">
        <span>Powered by</span>
        <img 
          src="https://www.gstatic.com/lamda/images/gemini_wordmark_600x120.png" 
          alt="Gemini AI" 
          className="h-4 opacity-50 grayscale"
        />
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
