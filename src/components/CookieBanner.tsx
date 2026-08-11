import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ANALYTICS_CONSENT_KEY } from '../services/analytics';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const legacyAccepted = localStorage.getItem('palmco_cookie_accepted');
    const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (legacyAccepted === 'true' && !consent) {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    } else if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'denied');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-xl z-50 bg-[#FDF6F0] text-[#1A332B] p-5 shadow-xl border border-[#1A332B]/20 rounded-none flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-up">
      <p className="text-xs text-[#423226] leading-relaxed">
        Podemos usar cookies opcionais para entender como a loja é utilizada. Você pode aceitar ou continuar somente com os cookies essenciais. Consulte nossa{' '}
        <Link to="/privacidade" className="underline font-medium text-[#1A332B] hover:text-[#C06A35] transition-colors">
          Política de Privacidade
        </Link>.
      </p>
      <div className="w-full md:w-auto flex gap-2 shrink-0">
        <button onClick={handleReject} className="flex-1 md:flex-none border border-[#1A332B]/40 px-4 py-2 text-xs font-medium uppercase tracking-wider">
          Somente essenciais
        </button>
        <button onClick={handleAccept} className="flex-1 md:flex-none border border-[#1A332B] bg-[#1A332B] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#FDF6F0]">
          Aceitar
        </button>
      </div>
    </div>
  );
}
