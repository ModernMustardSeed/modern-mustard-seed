import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_API_KEY = '270cb513-2c86-489b-b1f1-10dd129237c4';
const ASSISTANT_ID = 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

const VoiceAgentCTA: React.FC = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [expanded, setExpanded] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const vapi = new Vapi(VAPI_API_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => setCallStatus('active'));
    vapi.on('call-end', () => {
      setCallStatus('idle');
      setExpanded(false);
    });
    vapi.on('error', () => setCallStatus('idle'));

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current || callStatus !== 'idle') return;
    setCallStatus('connecting');
    setExpanded(true);
    try {
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessageMode: 'assistant-speaks-first',
      });
    } catch {
      setCallStatus('idle');
    }
  }, [callStatus]);

  const endCall = useCallback(async () => {
    setCallStatus('ending');
    await vapiRef.current?.stop();
  }, []);

  const handleClick = () => {
    if (callStatus === 'idle') startCall();
    else if (callStatus === 'active') endCall();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Expanded pill */}
      {expanded && callStatus !== 'idle' && (
        <div className="bg-neutral-950/90 backdrop-blur-md border border-mustard-500/20 rounded-2xl px-5 py-3 flex items-center gap-3 animate-fade-in">
          <div
            className={`w-2 h-2 rounded-full ${
              callStatus === 'active'
                ? 'bg-green-500 animate-pulse'
                : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-mono font-bold">
            {callStatus === 'connecting'
              ? 'Connecting...'
              : callStatus === 'active'
                ? 'Olivia is on the line'
                : 'Ending...'}
          </span>
          {callStatus === 'active' && (
            <button
              onClick={endCall}
              className="ml-2 text-[9px] uppercase tracking-[0.15em] text-red-400 font-mono font-bold hover:text-red-300 transition-colors"
            >
              End
            </button>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleClick}
        className={`group w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          callStatus === 'active'
            ? 'bg-red-500/90 hover:bg-red-500 shadow-red-500/20'
            : callStatus === 'connecting'
              ? 'bg-mustard-500/80 animate-pulse shadow-mustard-500/20'
              : 'bg-gradient-to-br from-mustard-500 to-mustard-600 hover:shadow-[0_0_30px_rgba(200,164,21,0.3)] shadow-mustard-500/20'
        }`}
        title={callStatus === 'idle' ? 'Talk to Olivia' : 'End call'}
      >
        {callStatus === 'active' ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default VoiceAgentCTA;
