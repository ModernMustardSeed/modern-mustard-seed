import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_API_KEY = '270cb513-2c86-489b-b1f1-10dd129237c4';
const ASSISTANT_ID = 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';

const industries = [
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: '🏠',
    description: 'Property inquiries, showing scheduling, buyer qualification',
    firstMessage:
      "Hi! Welcome to Prestige Realty — I'm your AI assistant. Are you looking to buy, sell, or just browsing properties today?",
  },
  {
    id: 'medical',
    name: 'Medical Office',
    icon: '🏥',
    description: 'Patient scheduling, insurance verification, appointment reminders',
    firstMessage:
      "Hello! Thank you for calling Wellness Medical Center. I can help you schedule an appointment, check insurance coverage, or answer general questions. How can I help you today?",
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    description: 'Reservations, menu inquiries, catering requests',
    firstMessage:
      "Hi there! Thanks for calling The Golden Table. I can help with reservations, answer questions about our menu, or set up catering for your next event. What can I do for you?",
  },
  {
    id: 'contractor',
    name: 'Contractor',
    icon: '🔨',
    description: 'Quote requests, scheduling, project inquiries',
    firstMessage:
      "Hey! Thanks for reaching out to Summit Construction. I handle all our initial inquiries — I can get you a quote, schedule an estimate, or answer questions about our services. What project do you have in mind?",
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: '🛒',
    description: 'Order status, returns, product recommendations',
    firstMessage:
      "Hi! Welcome to Luxe & Co customer support. I can help you track an order, process a return, or recommend products based on what you're looking for. How can I assist you today?",
  },
  {
    id: 'law-firm',
    name: 'Law Firm',
    icon: '⚖️',
    description: 'Intake, consultation scheduling, case inquiries',
    firstMessage:
      "Good day. Thank you for calling Carter & Associates Law Firm. I can schedule a consultation, take down case details, or answer general questions about our practice areas. How may I help you?",
  },
];

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

const ProductDemo: React.FC = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  // Initialize VAPI once
  useEffect(() => {
    const vapi = new Vapi(VAPI_API_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => setCallStatus('active'));
    vapi.on('call-end', () => {
      setCallStatus('idle');
      setSelectedIndustry(null);
      setVolumeLevel(0);
      setIsSpeaking(false);
    });
    vapi.on('volume-level', (vol: number) => setVolumeLevel(vol));
    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));
    vapi.on('error', (err: any) => {
      console.error('VAPI error:', err);
      setCallStatus('idle');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const startDemo = useCallback(
    async (industryId: string) => {
      const industry = industries.find((i) => i.id === industryId);
      if (!industry || !vapiRef.current) return;

      setSelectedIndustry(industryId);
      setCallStatus('connecting');

      try {
        await vapiRef.current.start(ASSISTANT_ID, {
          firstMessage: industry.firstMessage,
          firstMessageMode: 'assistant-speaks-first',
        });
      } catch (err) {
        console.error('Failed to start demo:', err);
        setCallStatus('idle');
        setSelectedIndustry(null);
      }
    },
    [],
  );

  const endDemo = useCallback(async () => {
    setCallStatus('ending');
    await vapiRef.current?.stop();
  }, []);

  const activeIndustry = industries.find((i) => i.id === selectedIndustry);

  return (
    <section id="demo" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      {/* Divider */}
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-6">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          Live Demo
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
          Hear It In <span className="text-gradient-mustard">Action</span>
        </h2>
        <p className="text-white/50 text-base md:text-lg font-body font-light leading-relaxed mb-4">
          Pick your industry. Our AI voice agent will answer the phone as if she already works for
          your business — handling calls, qualifying leads, and booking appointments. No scripts. No
          setup. Just talk.
        </p>
        <p className="text-white/35 text-sm font-mono tracking-wider">
          Your browser mic is required — the demo is a real voice conversation.
        </p>
      </div>

      {/* Active Call UI */}
      {callStatus !== 'idle' && activeIndustry && (
        <div className="max-w-lg mx-auto mb-16 animate-fade-in">
          <div className="glass-card p-8 md:p-10 text-center relative overflow-hidden">
            {/* Animated background glow */}
            <div
              className={`absolute inset-0 rounded-2xl transition-opacity duration-700 ${
                callStatus === 'active' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(200,164,21,0.06) 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10">
              {/* Industry badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mustard-500/10 border border-mustard-500/20 mb-6">
                <span className="text-lg">{activeIndustry.icon}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-mustard-400 font-mono font-bold">
                  {activeIndustry.name} Demo
                </span>
              </div>

              {/* Voice visualizer */}
              <div className="flex items-center justify-center gap-1 h-16 mb-6">
                {Array.from({ length: 24 }).map((_, i) => {
                  const barHeight =
                    callStatus === 'active'
                      ? Math.max(
                          4,
                          Math.sin((i / 24) * Math.PI) *
                            volumeLevel *
                            64 *
                            (isSpeaking ? 1.5 : 0.4),
                        )
                      : 4;
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-100"
                      style={{
                        height: `${barHeight}px`,
                        background:
                          callStatus === 'active'
                            ? isSpeaking
                              ? 'rgba(200,164,21,0.8)'
                              : 'rgba(200,164,21,0.3)'
                            : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  );
                })}
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div
                  className={`w-2 h-2 rounded-full ${
                    callStatus === 'active'
                      ? isSpeaking
                        ? 'bg-mustard-500 animate-pulse'
                        : 'bg-green-500 animate-pulse'
                      : callStatus === 'connecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-white/20'
                  }`}
                />
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono font-bold">
                  {callStatus === 'connecting'
                    ? 'Connecting...'
                    : callStatus === 'active'
                      ? isSpeaking
                        ? 'Olivia is speaking'
                        : 'Listening...'
                      : 'Ending call...'}
                </span>
              </div>

              {/* End call button */}
              <button
                onClick={endDemo}
                disabled={callStatus === 'ending'}
                className="group px-8 py-3.5 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
              >
                <span className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-red-400 group-hover:text-red-300">
                  End Demo Call
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Industry Grid */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.03] rounded-2xl overflow-hidden transition-opacity duration-500 ${
          callStatus !== 'idle' ? 'opacity-30 pointer-events-none' : ''
        }`}
      >
        {industries.map((industry) => (
          <button
            key={industry.id}
            onClick={() => startDemo(industry.id)}
            disabled={callStatus !== 'idle'}
            className="group p-8 md:p-10 bg-neutral-950/60 hover:bg-neutral-950/40 transition-all duration-500 relative overflow-hidden text-left"
          >
            {/* Hover glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 rounded-full blur-[80px] bg-mustard-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative z-10">
              {/* Icon */}
              <div className="text-3xl mb-4">{industry.icon}</div>

              {/* Title */}
              <h3 className="font-sans text-lg font-bold text-white/90 group-hover:text-white tracking-wide mb-2 transition-colors">
                {industry.name}
              </h3>

              {/* Description */}
              <p className="text-white/50 text-sm md:text-base font-body font-light leading-7 mb-6">
                {industry.description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-mustard-500/10 border border-mustard-500/20 flex items-center justify-center group-hover:bg-mustard-500/20 group-hover:border-mustard-500/40 transition-all">
                  <svg
                    className="w-3.5 h-3.5 text-mustard-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-mustard-400/60 group-hover:text-mustard-400 font-mono font-bold transition-colors">
                  Try This Demo
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16">
        <p className="text-white/40 text-sm font-body font-light mb-4">
          Impressed? Imagine this answering every call for your business — 24/7, never misses a
          beat.
        </p>
        <a
          href="#contact"
          className="inline-flex px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all duration-300"
        >
          Get Your Own Voice Agent
        </a>
      </div>
    </section>
  );
};

export default ProductDemo;
