import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('palmco_cookie_accepted');
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('palmco_cookie_accepted', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-xl z-50 bg-[#FDF6F0] text-[#1A332B] p-5 shadow-xl border border-[#1A332B]/20 rounded-none flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-up">
      <p className="text-xs text-[#423226] leading-relaxed">
        A Palm CO. utiliza cookies para personalizar sua experiência. Ao continuar navegando, você concorda com nossa{' '}
        <Link to="/privacidade" className="underline font-medium text-[#1A332B] hover:text-[#C06A35] transition-colors">
          Política de Privacidade
        </Link>.
      </p>
      <button
        onClick={handleAccept}
        className="w-full md:w-auto shrink-0 border border-[#1A332B] px-6 py-2 text-xs font-medium uppercase tracking-wider text-[#1A332B] hover:bg-[#1A332B] hover:text-[#FDF6F0] transition-colors"
      >
        Entendi
      </button>
    </div>
  );
}
