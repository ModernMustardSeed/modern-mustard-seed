import { useEffect } from 'react';

const VoiceAgentCTA: React.FC = () => {
  useEffect(() => {
    // Load VAPI SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
    script.defer = true;
    script.async = true;
    script.onload = () => {
      if ((window as any).vapiSDK) {
        (window as any).vapiSDK.run({
          apiKey: '2fdf36fa-e5de-4163-ab89-a67369e1b346',
          assistant: 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee',
          config: {
            position: 'bottom-right',
            offset: '40px',
            width: '50px',
            height: '50px',
            idle: {
              color: 'rgb(200, 164, 21)',
              type: 'pill',
              title: 'Talk to Olivia',
              subtitle: 'AI Voice Assistant',
              icon: 'https://unpkg.com/lucide-static@0.321.0/icons/mic.svg',
            },
            active: {
              color: 'rgb(200, 164, 21)',
              type: 'pill',
              title: 'Olivia is listening...',
              subtitle: 'Click to end call',
              icon: 'https://unpkg.com/lucide-static@0.321.0/icons/phone-off.svg',
            },
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // VAPI injects its own widget — no JSX needed
  return null;
};

export default VoiceAgentCTA;
