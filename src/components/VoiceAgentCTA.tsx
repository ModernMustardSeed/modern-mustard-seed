import { useState } from 'react';

const VoiceAgentCTA: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-mustard-500 to-mustard-600 shadow-[0_0_30px_rgba(200,164,21,0.3)] flex items-center justify-center hover:shadow-[0_0_40px_rgba(200,164,21,0.5)] transition-all duration-300 group"
        aria-label="Talk to AI Agent"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-black group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 glass-card p-6 shadow-2xl animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-mustard-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div>
              <h4 className="font-sans text-sm font-bold text-white">AI Voice Agent</h4>
              <p className="text-[10px] text-white/30 font-body">Online & ready</p>
            </div>
          </div>

          <p className="text-white/40 text-sm font-body font-light leading-6 mb-4">
            Talk to our AI agent. It can answer questions about our services, walk you through demos, and book a call with Sarah.
          </p>

          {/* VAPI Widget placeholder */}
          <div id="vapi-widget" className="mb-4">
            <div className="w-full py-8 rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-mono">Voice Widget</span>
              <span className="text-[8px] text-white/10 font-mono mt-1">Connecting soon...</span>
            </div>
          </div>

          <button
            className="w-full py-3 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_20px_rgba(200,164,21,0.2)] transition-all"
            onClick={() => alert('Voice agent integration coming soon!')}
          >
            Start Voice Call
          </button>
        </div>
      )}
    </>
  );
};

export default VoiceAgentCTA;
