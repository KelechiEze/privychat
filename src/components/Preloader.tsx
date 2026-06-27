import React, { useEffect, useState } from 'react';
import { Sparkles, Shield } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [fading, setFading] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showPCPulse, setShowPCPulse] = useState(true);
  const [typewriterStarted, setTypewriterStarted] = useState(false);

  // We want the typewriter to say "privy chat"
  const fullText = "privy chat";

  useEffect(() => {
    // Smooth breathing states for P and C
    const pcTimer = setInterval(() => {
      setShowPCPulse((prev) => !prev);
    }, 1500);

    // Start typewriter effect after 1 second (much sooner)
    const typewriterStartTime = 1000;
    let charIndex = 0;
    let typewriterInterval: NodeJS.Timeout | null = null;

    const startTypewriterTimeout = setTimeout(() => {
      setTypewriterStarted(true);
      typewriterInterval = setInterval(() => {
        if (charIndex < fullText.length) {
          setTypedText((prev) => prev + fullText.charAt(charIndex));
          charIndex++;
        } else {
          if (typewriterInterval) clearInterval(typewriterInterval);
        }
      }, 100);
    }, typewriterStartTime);

    // Fade out at 4.5 seconds (so user sees full text)
    const fadeTimeout = setTimeout(() => {
      setFading(true);
    }, 4500);

    // Call onComplete after animations finalize at 5 seconds
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearInterval(pcTimer);
      clearTimeout(startTypewriterTimeout);
      if (typewriterInterval) clearInterval(typewriterInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete, fullText]);

  return (
    <div
      id="privy-preloader"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-all duration-700 ease-in-out ${
        fading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Absolute minimalist ambient circles */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00c5bc]/3 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center text-center z-10 px-6">
        
        {/* PC Initial Letters container with sleek ring */}
        <div className="relative mb-8 flex items-center justify-center w-28 h-28 bg-white rounded-3xl border border-slate-100 shadow-2xl transition-all duration-1000 ease-in-out hover:scale-105">
          {/* Subtle live radar ping under the PC container */}
          <div className="absolute inset-0 rounded-3xl bg-radial from-[#00c5bc]/10 to-transparent animate-ping opacity-35" />
          
          {/* Inner ring gradient */}
          <div className="absolute inset-2 rounded-2xl border border-slate-100 bg-[#fafcfd] flex items-center justify-center">
            <span className="text-4xl font-black font-sans text-slate-900 tracking-tight select-none">
              <span className={`inline-block transition-all duration-1000 transform ${showPCPulse ? 'text-slate-900 scale-110' : 'text-slate-600 scale-100'}`}>P</span>
              <span className={`inline-block transition-all duration-1000 transform ${showPCPulse ? 'text-[#00c5bc] scale-100' : 'text-[#00c5bc] scale-110'}`}>C</span>
            </span>
          </div>

          {/* Miniature shield indicator for security context */}
          <div className="absolute -top-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[7px] text-white/95 font-mono select-none uppercase tracking-widest font-black flex items-center gap-1">
            <Shield className="w-2 h-2 text-[#00c5bc]" /> Secure
          </div>
        </div>

        {/* Dynamic Space reserving area for typewriter subtitle text */}
        <div className="h-14 flex flex-col justify-center items-center">
          {typewriterStarted && (
            <h1 className="text-2xl font-display font-extrabold tracking-[0.15em] text-slate-900 uppercase flex items-center gap-0.5">
              <span className="text-slate-900">privy</span>
              <span className="text-[#00c5bc]"> chat</span>
              {/* Typewriter cursor */}
              {typedText.length < fullText.length && (
                <span className="inline-block w-[3px] h-5 bg-[#00c5bc] ml-1 animate-pulse" />
              )}
            </h1>
          )}
          {!typewriterStarted && (
            <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.15em] text-slate-400 font-bold select-none animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#00c5bc]" />
              <span>Establishing secure connection...</span>
            </div>
          )}
        </div>

        {/* Subtle timer or preloader progress */}
        <div className="mt-12 w-32 h-0.5 bg-slate-100 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-[#00c5bc] to-teal-400 rounded-full transition-all duration-1000 ease-linear" 
            style={{ width: fading ? '100%' : typewriterStarted ? '66%' : '33%' }}
          />
        </div>
      </div>

      {/* Inject smooth global CSS loader animation directly */}
      <style>{`
        @keyframes loaderWidth {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-loaderWidth {
          animation: loaderWidth 7s ease-in-out infinite;
        }
      `}</style>

      {/* Footer System Credentials */}
      <div className="absolute bottom-10 flex flex-col items-center gap-1.5 pointer-events-none select-none">
        <span className="text-[8.5px] font-mono text-slate-400 tracking-widest uppercase font-bold">Aura Chat cryptographic system</span>
        <span className="text-[7.5px] font-mono text-slate-300 uppercase tracking-widest">End-to-End Encrypted</span>
      </div>
    </div>
  );
}