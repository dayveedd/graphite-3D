import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store';

export const Scan = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const { generateModel, isGenerating } = useStore();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const startCamera = async () => {
    setIsStartingCamera(true);
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (err) {
      setError("Unable to access camera. Please use file upload.");
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
    setStream(null);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      handleProcess(dataUrl);
      stopCamera();
    }
  }, [videoRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleProcess(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async (base64: string) => {
    if (!process.env.API_KEY) {
      setError("API_KEY missing from environment.");
      return;
    }
    try {
      const id = await generateModel(base64, process.env.API_KEY);
      navigate(`/studio/${id}`);
    } catch (err: any) {
      setError(err.message || "CAD extraction failed. Check lighting and clarity.");
    }
  };

  // Ensure video plays when stream is ready
  React.useEffect(() => {
    if (videoRef.current && stream) {
      console.log("Assigning stream to video");
      videoRef.current.srcObject = stream;
      videoRef.current.play().then(() => console.log("Video playing")).catch(e => console.error("Play error:", e));
    }
  }, [stream]);

  React.useEffect(() => {
    return () => stopCamera();
  }, []);

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 p-8 text-center text-amber-50">
        <RefreshCw className="w-16 h-16 text-amber-600 animate-spin mb-8" />
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Digitizing Blueprint</h2>
        <div className="max-w-md space-y-4 opacity-70">
          <p>Gemini is mapping vector projections to 3D Cartesian coordinates...</p>
          <div className="h-1 bg-stone-800 w-full rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col overflow-hidden relative">
      {/* 1. Camera View Layer (Always rendered but hidden via CSS/visibility) */}
      <div className={`absolute inset-0 z-0 bg-black transition-opacity duration-500 ${isCameraActive ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Overlay Guide - Only show when active */}
        {isCameraActive && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] h-[60vh] border-2 border-white/40 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-amber-500 rounded-tl-2xl"></div>
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-amber-500 rounded-tr-2xl"></div>
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-amber-500 rounded-bl-2xl"></div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-amber-500 rounded-br-2xl"></div>
            </div>
            <div className="absolute top-12 left-0 right-0 text-center">
              <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-white/10">
                Position blueprint within frame
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main UI Layer (Relative Content) */}
      <div className="relative z-20 flex-1 flex flex-col">

        {/* Top Bar / Placeholder Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          {!isCameraActive && (
            <div className="text-center">
              <div className="w-24 h-24 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-8 border border-stone-800 shadow-xl">
                <Camera className="w-10 h-10 text-stone-600" />
              </div>
              <h3 className="text-white font-bold text-2xl mb-4 tracking-tight">Scanner Ready</h3>
              <p className="text-stone-500 mb-8 max-w-xs mx-auto">Point camera at an orthographic or isometric engineering drawing.</p>

              <button
                onClick={startCamera}
                disabled={isStartingCamera}
                className="bg-amber-600 active:bg-amber-700 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center gap-3 mx-auto disabled:opacity-50 disabled:grayscale"
              >
                {isStartingCamera ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                {isStartingCamera ? "Initializing..." : "Enable Camera"}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Controls - Always visible but styled differently */}
        <div className={`${isCameraActive ? 'bg-black/40 backdrop-blur-md border-white/10' : 'bg-stone-900 border-stone-800'} px-6 py-10 pb-16 rounded-t-[40px] border-t flex flex-col gap-8 transition-colors duration-500 mt-auto`}>
          <div className="flex w-full items-center justify-between max-w-lg mx-auto">
            {/* File Upload Button */}
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${isCameraActive ? 'bg-black/50 border-white/20 text-white' : 'bg-stone-800 border-amber-900/20 text-stone-500'}`}>
                <Upload className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isCameraActive ? 'text-white/60' : 'text-stone-600'}`}>Import</span>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.pdf" />
            </button>

            {/* Shutter Button - Handles both capture and enabling if not active? No, just capture */}
            <div className="relative">
              <button
                onClick={capturePhoto}
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${isCameraActive ? 'border-white bg-transparent hover:bg-white/10 active:scale-95 cursor-pointer' : 'border-stone-800 bg-stone-800 opacity-50 cursor-not-allowed'}`}
                disabled={!isCameraActive}
              >
                <div className={`w-18 h-18 rounded-full transition-all duration-300 ${isCameraActive ? 'w-[72px] h-[72px] bg-amber-500 animate-pulse' : 'w-16 h-16 bg-stone-700'}`}></div>
              </button>
            </div>

            {/* Close/Stop Button (New) or Spacer */}
            {isCameraActive ? (
              <button onClick={stopCamera} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-black/50 border-white/20 text-white hover:bg-red-900/50">
                  <span className="font-black text-xs">STOP</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Cancel</span>
              </button>
            ) : (
              <div className="w-14"></div>
            )}
          </div>

          <div className="text-center pointer-events-none">
            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isCameraActive ? 'text-white/50' : 'text-stone-700'}`}>
              Gemini Vision • CAD Extraction
            </p>
          </div>
        </div>
      </div>

      {/* Error Message Toast */}
      {error && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 fade-in">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span className="text-sm font-bold leading-tight">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};
