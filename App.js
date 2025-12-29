import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SUPPORTED_LANGUAGES } from './types.js';
import { translateText, detectLanguage, speakText } from './services/aiService.js';
import { 
  ArrowRightLeft, Volume2, Copy, History as HistoryIcon, 
  Check, Loader2, Sparkles, ChevronRight, PenTool, 
  FileUp, Search, Globe, Mic
} from 'lucide-react';
import * as mammoth from 'mammoth';

const App = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [tone, setTone] = useState('Neutral');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
        setSourceText(transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    try {
      const result = await translateText(sourceText, targetLang, sourceLang, tone);
      setTranslatedText(result);
    } catch (e) { console.error(e); }
    finally { setIsTranslating(false); }
  }, [sourceText, targetLang, sourceLang, tone]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="h-16 border-b bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">D</div>
          <span className="font-bold text-slate-800">Doc Trans <span className="text-indigo-600">Local</span></span>
        </div>
      </nav>

      <main className="flex-1 max-w-[1200px] mx-auto w-full p-8 gap-8 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
          <div className="flex flex-col glass-panel rounded-2xl overflow-hidden border">
            <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
              <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="bg-transparent font-bold text-sm outline-none">
                <option value="auto">Auto Detect</option>
                {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider"><FileUp size={14} className="inline mr-1" /> Import File</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={async (e) => {
                const file = e.target.files[0];
                if (file) setSourceText(await file.text());
              }} />
            </div>
            <textarea 
              className="flex-1 p-6 outline-none resize-none doc-editor text-lg" 
              placeholder="Paste or type text..." 
              value={sourceText} 
              onChange={e => setSourceText(e.target.value)} 
            />
            <div className="p-3 border-t flex gap-2">
              <button onClick={() => speakText(sourceText)} className="p-2 hover:bg-slate-100 rounded-lg"><Volume2 size={18} /></button>
              <button onClick={() => {
                if (isRecording) recognitionRef.current.stop();
                else { recognitionRef.current.start(); setIsRecording(true); }
              }} className={`p-2 rounded-lg ${isRecording ? 'bg-red-50 text-red-600' : 'hover:bg-slate-100'}`}><Mic size={18} /></button>
            </div>
          </div>

          <div className="flex flex-col glass-panel rounded-2xl overflow-hidden border">
            <div className="bg-indigo-50/30 p-4 border-b flex justify-between items-center">
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="bg-transparent font-bold text-sm outline-none">
                {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              {isTranslating && <Loader2 size={14} className="animate-spin text-indigo-600" />}
            </div>
            <div className="flex-1 p-6 text-lg whitespace-pre-wrap text-slate-700">
              {translatedText || <span className="text-slate-300 italic">Result will appear here...</span>}
            </div>
            <div className="p-3 border-t flex gap-2">
              <button onClick={() => speakText(translatedText, targetLang)} className="p-2 hover:bg-slate-100 rounded-lg"><Volume2 size={18} /></button>
              <button onClick={() => { navigator.clipboard.writeText(translatedText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 hover:bg-slate-100 rounded-lg">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
              <button onClick={handleTranslate} className="ml-auto bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">Translate <ChevronRight size={14}/></button>
            </div>
          </div>
        </div>
      </main>
      <footer className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Local Browser AI Engine • No API Keys
      </footer>
    </div>
  );
};

export default App;