import { useState } from 'react';
import { Seo } from '../components/Seo';
import { STORE_CONTACT } from '../config/contact';

export function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulando envio de contato
    setSent(true);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <Seo title="Contato" description="Entre em contato com a Palm CO. para tirar dúvidas sobre produtos, pedidos e atendimento." path="/contato" />
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">Fale Conosco</span>
          <h1 className="text-4xl font-serif text-[#1A332B]">Contato</h1>
          <p className="text-sm text-[#423226] max-w-md mx-auto leading-relaxed">
            Tem alguma dúvida ou gostaria de marcar uma visita ao nosso showroom? Mande uma mensagem para nós.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white p-8 rounded border border-[#C06A35]/20 space-y-6">
            <h2 className="text-2xl font-serif text-[#1A332B]">Envie uma Mensagem</h2>
            {sent ? (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded text-sm font-medium">
                Mensagem enviada com sucesso! Responderemos o mais breve possível.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Nome Completo</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-[#FDF6F0]/50 border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors text-sm"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">E-mail</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-[#FDF6F0]/50 border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors text-sm"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Mensagem</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-[#FDF6F0]/50 border border-[#C06A35] p-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors text-sm"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#1A332B] hover:bg-[#433E38] text-white text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Enviar Mensagem
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-8 flex flex-col justify-center">
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">WhatsApp</h3>
              <a href={STORE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-lg font-serif text-[#1A332B] underline underline-offset-4 hover:text-[#C06A35]">
                {STORE_CONTACT.whatsappDisplay}
              </a>
              <p className="text-xs text-[#A8A29E]">Atendimento de Segunda a Sexta, das 9h às 18h.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">E-mail</h3>
              <p className="text-lg font-serif text-[#1A332B]">contato@littlepalm.co</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">Showroom Presencial</h3>
              <p className="text-sm text-[#423226] leading-relaxed">
                Rua das Palmeiras, 123 — Jardins<br />
                São Paulo - SP<br />
                CEP: 01234-567
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
