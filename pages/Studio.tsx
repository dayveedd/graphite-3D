import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Environment, Bounds, useBounds } from '@react-three/drei';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, ChevronRight, MessageSquare, Send, X, BoxSelect, Split, Ruler, Volume2, PlayCircle, PauseCircle, RefreshCw, Image, PanelLeftClose, PanelRightClose, Download } from 'lucide-react';
import { useStore } from '../store';
import { ModelRenderer } from '../components/ModelRenderer';
import { DocumentPreview } from '../components/DocumentPreview';
import { createChatSession } from '../services/geminiService';
import { Chat } from "@google/genai";
import { Unit } from '../types';

export const Studio = () => {
  const { id } = useParams();
  const {
    models, currentModel, setCurrentModel,
    viewMode, setViewMode,
    unit, setUnit,
    wireframe, toggleWireframe,
    showDimensions, toggleShowDimensions
  } = useStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'steps'>('steps');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const synthRef = useRef(window.speechSynthesis);
  const boundsRef = useRef<any>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExportMenuOpen && !(e.target as Element).closest('.export-menu-container')) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  // ... (rest of imports/effects)

  useEffect(() => {
    if (id) setCurrentModel(id);
  }, [id, models]);

  useEffect(() => {
    if (currentModel && process.env.API_KEY) {
      createChatSession(process.env.API_KEY, currentModel).then(setChatSession);

      // Reset chat and show welcome message for the new model
      setChatHistory([{
        role: 'model',
        text: `Hello! I see you're looking at "${currentModel.name}". I can help clarify specific features, explain dimensions, or walk you through the construction steps. What would you like to know?`
      }]);
    }
  }, [currentModel]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !chatSession) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage("");
    setIsChatLoading(true);
    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setChatHistory(prev => [...prev, { role: 'model', text: result.text || "I couldn't process that." }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const speakText = (text: string) => {
    synthRef.current.cancel();

    // Ensure voices are loaded
    let voices = synthRef.current.getVoices();

    // If voices aren't loaded yet, wait for them
    if (voices.length === 0) {
      synthRef.current.addEventListener('voiceschanged', () => {
        voices = synthRef.current.getVoices();
        speakWithVoice(text, voices);
      }, { once: true });
      return;
    }

    speakWithVoice(text, voices);
  };

  const speakWithVoice = (text: string, voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(text);

    // Find the most natural-sounding English voice
    // Prioritize: Google UK English Female > any Google voice > any English female voice
    const preferredVoice =
      voices.find(v => v.name === 'Google UK English Female') ||
      voices.find(v => v.name === 'Google US English') ||
      voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.name.toLowerCase().includes('samantha')) ||
      voices.find(v => v.name.toLowerCase().includes('karen')) ||
      voices.find(v => v.name.toLowerCase().includes('natural')) ||
      voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Tune for maximum naturalness
    utterance.rate = 0.9; // Slower, more deliberate speech
    utterance.pitch = 1.1; // Warmer, friendlier tone
    utterance.volume = 1.0;

    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    synthRef.current.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    } else if (isSpeaking && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  };

  // Helper component to trigger bounds fitting programmatically
  const BoundsRefresher = React.forwardRef((props, ref) => {
    const api = useBounds();
    React.useImperativeHandle(ref, () => ({
      fit: () => api.refresh().fit().clip(),
      refresh: () => api.refresh().fit().clip()
    }));
    return null;
  });

  // Helper for generating text (moved up or accessible)
  const generateStepText = (part: any, index: number) => {
    const action = part.operation === 'base' ? 'Start with' : part.operation === 'add' ? 'Add' : 'Subtract';
    const convertDimension = (val: number) => {
      if (unit === 'mm') return `${val}mm`;
      if (unit === 'cm') return `${(val / 10).toFixed(1)}cm`;
      return `${val}mm`;
    };
    const dimensionStr = part.dimensions
      .filter((d: number) => d > 0)
      .map((d: number) => convertDimension(d))
      .join(' x ');
    return `${action} a ${part.type}: ${part.explanation}. Dims: ${dimensionStr}`;
  };

  const handleExportPDF = async (mode: 'whole' | 'split' | 'combined') => {
    setIsExporting(true);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const originalViewMode = viewMode;
    // We assume wireframe should be ON for "technical" export as requested, or keep user State. 
    // User asked "export the 3D model (wireframe)", implies forcing wireframe.
    const originalWireframe = wireframe;
    const canvas = document.querySelector('canvas');

    if (!canvas) {
      console.error("Canvas not found");
      setIsExporting(false);
      return;
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const captureState = async (vMode: 'assembled' | 'separated', title: string, includeInstructions: boolean) => {
      // 1. Set State
      setViewMode(vMode);
      if (!wireframe) toggleWireframe(); // Force wireframe on if off (naive, better to have setWireframe)

      // 2. Refresh Bounds to ensure perfect fit
      if (boundsRef.current) {
        boundsRef.current.refresh();
      }

      // 3. Wait for layout/render/transition
      await new Promise(resolve => setTimeout(resolve, 1000)); // Broad wait for stability

      // 4. Capture
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgProps = pdf.getImageProperties(imgData);

      // fit image to page width minus margins
      const printWidth = pageWidth - (margin * 2);
      const printHeight = (imgProps.height * printWidth) / imgProps.width;

      // If height is too tall, scale by height instead
      let finalWidth = printWidth;
      let finalHeight = printHeight;
      if (finalHeight > (pageHeight - 40)) { // 40mm for title/header
        finalHeight = pageHeight - 40;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }

      const xPos = (pageWidth - finalWidth) / 2; // Center X

      // Add Title
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text(title, margin, margin + 5);

      // Add Image
      pdf.addImage(imgData, 'PNG', xPos, margin + 10, finalWidth, finalHeight);

      // Add Instructions if requested (e.g. for Split View or Combined)
      if (includeInstructions && currentModel?.parts) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text("Construction Instructions & Parts List", margin, margin + 10);
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        let y = margin + 20;
        currentModel.parts.forEach((part: any, i: number) => {
          const text = `${i + 1}. ${generateStepText(part, i)}`;
          const splitText = pdf.splitTextToSize(text, pageWidth - (margin * 2));

          // Check page break
          if (y + (splitText.length * 5) > pageHeight - margin) {
            pdf.addPage();
            y = margin + 10;
          }

          pdf.text(splitText, margin, y);
          y += (splitText.length * 5) + 2;
        });
      }
    };

    try {
      if (mode === 'whole' || mode === 'combined') {
        const title = `Assembled View - ${currentModel?.name || 'Untitled'}`;
        await captureState('assembled', title, false);
      }

      if (mode === 'combined') {
        pdf.addPage();
      }

      if (mode === 'split' || mode === 'combined') {
        const title = `Exploded View - ${currentModel?.name || 'Untitled'}`;
        // Include instructions on the split view report
        await captureState('separated', title, true);
      } else if (mode === 'whole') {
        // If only whole requested, user might want instructions too? 
        // Request said "description on split should also be part", implying specifically relevant to split.
        // But "construction instructions" are general. Let's add them for all single exports too if space permits, or just split.
        // Let's stick to adding them to Split/Combined for now as they relate to "parts".
      }

      pdf.save(`Graphite_Export_${currentModel?.name || 'Model'}.pdf`);

    } catch (e) {
      console.error("Export failed", e);
    } finally {
      // Restore state
      setViewMode(originalViewMode);
      if (wireframe !== originalWireframe) toggleWireframe();
      setIsExporting(false);
    }
  };

  if (!currentModel) return (
    <div className="h-screen flex items-center justify-center bg-stone-50">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  // Removed duplicate generateStepText


  return (
    <div className="h-screen bg-stone-50 flex flex-col md:flex-row overflow-hidden">
      <div className="md:hidden absolute top-0 left-0 right-0 p-4 z-50 flex justify-between pointer-events-none">
        <Link to="/history" className="pointer-events-auto bg-white p-2 rounded-full shadow border">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </Link>
      </div>

      {/* Left Panel - Blueprint View */}
      {leftPanelOpen && (
        <div className="w-full md:w-1/4 h-1/3 md:h-full bg-white border-r relative flex flex-col hidden md:flex">
          <div className="p-4 border-b font-bold text-stone-500 text-xs uppercase tracking-widest bg-stone-100 flex justify-between items-center">
            <span>Blueprint View</span>
            <button onClick={() => setLeftPanelOpen(false)} className="p-1 hover:bg-stone-200 rounded">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <DocumentPreview src={currentModel.originalImage} alt="Blueprint" className="w-full h-full object-contain p-6" />
        </div>
      )}

      {/* Center - 3D Canvas */}
      <div className={`h-full relative bg-stone-200 transition-all duration-300 ${leftPanelOpen && rightPanelOpen ? 'w-full md:w-1/2' : leftPanelOpen || rightPanelOpen ? 'w-full md:w-3/4' : 'w-full'}`}>
        <Canvas shadows gl={{ preserveDrawingBuffer: true }} camera={{ position: [30, 30, 30], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <Stage environment="city" intensity={0.6} adjustCamera={false}>
              <Bounds observe margin={1.2}>
                <BoundsRefresher ref={boundsRef} />
                <ModelRenderer
                  parts={currentModel.parts}
                  viewMode={viewMode}
                  wireframe={wireframe}
                  showDimensions={showDimensions}
                  unit={unit}
                />
              </Bounds>
            </Stage>
            <Grid infiniteGrid sectionColor="#94a3b8" cellColor="#cbd5e1" />
          </Suspense>
          <OrbitControls makeDefault minDistance={2} maxDistance={1000} />
        </Canvas>

        {isExporting && (
          <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-pulse">
              <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-stone-800">Generating PDF...</h3>
              <p className="text-stone-500">Capturing high-res views</p>
            </div>
          </div>
        )}

        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-2xl border border-slate-200 flex items-center gap-4 z-30">
          <div className="flex bg-stone-100 rounded-full p-1">
            <button onClick={() => setViewMode('assembled')} className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${viewMode === 'assembled' ? 'bg-white text-amber-700 shadow' : 'text-stone-600'}`}>Assembled</button>
            <button onClick={() => setViewMode('separated')} className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${viewMode === 'separated' ? 'bg-white text-amber-700 shadow' : 'text-stone-600'}`}>Split</button>
          </div>
          <div className="w-px h-6 bg-stone-300"></div>
          <div className="flex bg-stone-100 rounded-full p-1">
            {(['mm', 'cm'] as Unit[]).map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${unit === u ? 'bg-white text-amber-700 shadow' : 'text-stone-600'}`}>{u}</button>
            ))}
          </div>

          <div className="w-px h-6 bg-stone-300"></div>
          <div className="relative export-menu-container">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className={`p-2 rounded-full transition-colors ${isExportMenuOpen ? 'bg-amber-100 text-amber-700' : 'hover:bg-stone-100 text-stone-600'}`}
            >
              <Download className="w-5 h-5" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden animate-in slide-in-from-top-2 fade-in z-50">
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase text-stone-400 tracking-wider border-b border-stone-100 mb-1">Export PDF</div>
                  <button onClick={() => { setIsExportMenuOpen(false); handleExportPDF('whole'); }} className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Assembled Only
                  </button>
                  <button onClick={() => { setIsExportMenuOpen(false); handleExportPDF('split'); }} className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Split View Only
                  </button>
                  <button onClick={() => { setIsExportMenuOpen(false); handleExportPDF('combined'); }} className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Combined Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-30">
          <button onClick={toggleWireframe} className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 border ${wireframe ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-stone-700 border-stone-300'}`}><BoxSelect className="w-4 h-4" /> Wireframe</button>
          <button onClick={toggleShowDimensions} className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 border ${showDimensions ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-stone-700 border-stone-300'}`}><Ruler className="w-4 h-4" /> Dimensions</button>
        </div>

        {/* Panel toggle buttons */}
        {!leftPanelOpen && (
          <button onClick={() => setLeftPanelOpen(true)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg border border-slate-200 z-30 hover:bg-white hidden md:flex">
            <Image className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* MOBILE TOGGLE BUTTON - Direct render */}
        {!rightPanelOpen && (
          <div
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '16px',
              zIndex: 99999,
            }}
          >
            <button
              type="button"
              onClick={() => {
                console.log('Mobile toggle clicked, opening panel');
                setRightPanelOpen(true);
              }}
              style={{
                backgroundColor: '#b45309',
                color: 'white',
                padding: '16px',
                borderRadius: '50%',
                border: 'none',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare style={{ width: '24px', height: '24px' }} />
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Blueprint/AI Tutor */}
      {rightPanelOpen && (
        <div className="fixed md:relative bottom-0 right-0 w-full md:w-1/4 h-1/2 md:h-full bg-white border-l flex flex-col shadow-2xl z-[9998]">
          <div className="flex bg-stone-100 border-b">
            <button onClick={() => setActiveTab('steps')} className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'steps' ? 'text-amber-700 border-b-2 border-amber-700 bg-white' : 'text-stone-500'}`}><Split className="w-3 h-3 md:w-4 md:h-4" /> Blueprint</button>
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'chat' ? 'text-amber-700 border-b-2 border-amber-700 bg-white' : 'text-stone-500'}`}><MessageSquare className="w-3 h-3 md:w-4 md:h-4" /> AI Tutor</button>
            <button onClick={() => {
              console.log('Closing right panel');
              setRightPanelOpen(false);
            }} className="px-2 md:px-3 hover:bg-stone-200 transition-colors">
              <PanelRightClose className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-amber-50/30">
            {activeTab === 'steps' && (
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs md:text-sm uppercase tracking-wider">Construction</h3>
                  <div className="flex gap-2">
                    <button onClick={() => speakText(currentModel.parts.map((p, i) => generateStepText(p, i)).join(' '))} className="text-amber-700 p-2 rounded-full hover:bg-amber-50 transition-colors"><PlayCircle className="w-5 h-5 md:w-6 md:h-6" /></button>
                    {isSpeaking && (
                      <button onClick={toggleSpeech} className="text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors">{isPaused ? <PlayCircle className="w-5 h-5 md:w-6 md:h-6" /> : <PauseCircle className="w-5 h-5 md:w-6 md:h-6" />}</button>
                    )}
                  </div>
                </div>
                {currentModel.parts.map((part, i) => (
                  <div key={part.id} className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
                    <div className="flex justify-between items-start mb-2 md:mb-3">
                      <span className="bg-stone-100 text-stone-600 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Part {i + 1} • {part.operation}</span>
                      <button onClick={() => speakText(generateStepText(part, i))} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity"><Volume2 className="w-4 h-4" /></button>
                    </div>
                    <p className="text-slate-700 text-xs md:text-sm font-medium leading-relaxed">{generateStepText(part, i)}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full bg-amber-50/30">
                <div className="flex-1 p-4 space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-amber-700 text-white shadow-lg' : 'bg-white border text-stone-700 shadow-sm'}`}>
                        <ReactMarkdown
                          components={{
                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            strong: ({ node, ...props }) => <b className="font-bold" {...props} />
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border text-stone-500 p-3 rounded-xl shadow-sm text-xs flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Thinking...
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4 bg-white border-t border-slate-200">
                  <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
                    <input type="text" disabled={isChatLoading} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask something..." className="flex-1 bg-transparent border-none px-3 md:px-4 py-2 text-xs md:text-sm outline-none disabled:opacity-50" />
                    <button disabled={isChatLoading} onClick={handleSendMessage} className="p-2 bg-amber-700 text-white rounded-lg shadow-md disabled:bg-stone-400"><Send className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
