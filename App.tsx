
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  PenTool,
  Upload,
  FileUp,
  AlertCircle,
  MicOff,
  Search
} from 'lucide-react';
import mammoth from 'mammoth';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Audio utility functions for Gemini Live API
function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createAudioBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

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
  const [fileError, setFileError] = useState<string | null>(null);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptionRef = useRef('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const detectedLangName = useMemo(() => {
    if (!detectedLang) return null;
    return SUPPORTED_LANGUAGES.find(l => l.code === detectedLang)?.name || detectedLang.toUpperCase();
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
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, tone]);

  // Debounced translation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.length > 5 && !isRecording) handleTranslate();
    }, 1200);
    return () => clearTimeout(timer);
  }, [sourceText, targetLang, tone, isRecording]);

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
    setFileError(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'txt') {
        const text = await file.text();
        setSourceText(text);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(result.value);
      } else {
        setFileError("Unsupported file format. Please upload .txt or .docx");
      }
    } catch (err) {
      console.error("File processing error:", err);
      setFileError("Error reading document. Please try again.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Live Transcription Implementation
  const stopRecording = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "You are a transcription assistant. Your only task is to listen and let the system transcribe. Do not generate any audio response yourself."
        },
        callbacks: {
          onopen: () => {
            const source = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const newText = message.serverContent.inputTranscription.text;
              transcriptionRef.current += " " + newText;
              setSourceText(prev => (prev.trim() + " " + newText).trim());
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopRecording();
          },
          onclose: () => {
            stopRecording();
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice input:", err);
      setIsRecording(false);
    }
  }, [stopRecording]);

  const toggleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
              <div className="flex items-center relative">
                <select 
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 px-3 py-2 outline-none"
                >
                  <option value="auto">Auto Detect</option>
                  {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                
                {sourceLang === 'auto' && detectedLangName && (
                  <div className="absolute -top-6 left-3 animate-in flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    <Search size={8} /> Detected: {detectedLangName}
                  </div>
                )}
              </div>

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
            
            {isProcessingFile && (
              <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-50 px-3 py-1.5 rounded-full">
                <Loader2 size={12} className="animate-spin" />
                EXTRACTING DOC
              </div>
            )}

            {isRecording && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-full animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                VOICE TYPING ACTIVE
              </div>
            )}
          </div>

          {fileError && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in border border-red-100">
              <AlertCircle size={14} /> {fileError}
              <button onClick={() => setFileError(null)} className="ml-auto hover:text-red-800">×</button>
            </div>
          )}

          {/* Document Panes */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
            {/* Source Pane */}
            <div className="flex flex-col glass-panel pro-shadow rounded-3xl overflow-hidden border-2 border-transparent focus-within:border-indigo-100 transition-all">
              <div className="bg-white/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Source Document</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                    <FileText size={12} /> {stats.words} Words
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-1 rounded transition-colors uppercase tracking-tight"
                  >
                    <FileUp size={12} /> Import Doc
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.docx"
                    onChange={handleFileUpload} 
                  />
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
                  title="Speak Source"
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition-all ${isRecording ? 'text-red-600 bg-red-50 shadow-inner' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title={isRecording ? "Stop Recording" : "Start Voice Input"}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
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
                  title="Speak Translation"
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
                  title="Copy to Clipboard"
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
