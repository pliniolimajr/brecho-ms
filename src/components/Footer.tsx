import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { BRAND_NAME } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { firstValidationMessage, newsletterSchema } from '../utils/schemas';

interface FooterProps {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
}

const FooterColumn: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#C06A35]/20 md:border-none py-4 md:py-0">
      <button 
        className="w-full flex justify-between items-center md:cursor-default md:pointer-events-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-xs uppercase tracking-widest font-bold text-[#FDF6F0]">{title}</h3>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-[#FDF6F0] transition-transform md:hidden ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`mt-4 flex-col gap-3 md:flex ${isOpen ? 'flex' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
};

const Footer: React.FC<FooterProps> = ({ onLinkClick }) => {
  const { session, isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const validated = newsletterSchema.safeParse({ name, email });
      if (!validated.success) {
        setStatus('error');
        setMessage(firstValidationMessage(validated.error));
        return;
      }
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([validated.data]);
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          setMessage('Este e-mail já está cadastrado!');
        } else {
          throw error;
        }
      } else {
        setStatus('success');
        setMessage('Cadastro realizado com sucesso!');
        setName('');
        setEmail('');
      }
    } catch {
      setStatus('error');
      setMessage('Ocorreu um erro. Tente novamente mais tarde.');
    }
  };

  return (
    <footer className="bg-[#1A332B] text-[#FDF6F0] pt-12 pb-6 px-6 md:px-12 border-t-4 border-[#C06A35]">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Newsletter Section */}
        <div className="border-b border-[#C06A35]/30 pb-12 mb-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-serif text-[#C06A35] mb-2 uppercase tracking-widest">Newsletter</h2>
            <p className="text-sm text-[#FDF6F0]/70 mb-6 font-light">Cadastre-se para receber nossas novidades e ofertas exclusivas.</p>
            
            {status === 'success' ? (
              <div className="bg-[#C06A35]/20 text-[#C06A35] p-4 rounded text-sm">{message}</div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Nome" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent border-b border-[#FDF6F0]/30 px-2 py-3 text-sm text-[#FDF6F0] focus:outline-none focus:border-[#C06A35] transition-colors placeholder:text-[#FDF6F0]/30"
                />
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent border-b border-[#FDF6F0]/30 px-2 py-3 text-sm text-[#FDF6F0] focus:outline-none focus:border-[#C06A35] transition-colors placeholder:text-[#FDF6F0]/30"
                />
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="mt-4 md:mt-0 px-8 py-3 bg-[#C06A35] text-[#1A332B] font-bold text-xs uppercase tracking-widest hover:bg-[#A85A2A] transition-colors disabled:opacity-50"
                >
                  {status === 'loading' ? 'Enviando...' : 'Assinar'}
                </button>
              </form>
            )}
            {status === 'error' && <p className="text-red-400 text-xs mt-2">{message}</p>}
          </div>
        </div>

        {/* Main Footer Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-2 mb-12">
          
          <FooterColumn title="Institucional">
            <Link to="/sobre" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Nossa História</Link>
            <a href="#products" onClick={(e) => onLinkClick(e, 'products')} className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Catálogo</a>
          </FooterColumn>

          {session && isAdmin ? (
            <FooterColumn title="Painel Admin">
              <Link to="/admin" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Painel do Administrador</Link>
            </FooterColumn>
          ) : (
            <FooterColumn title="Minha Conta">
              <Link to="/login" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Acessar Conta</Link>
              <Link to="/minha-conta" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Meus Pedidos</Link>
            </FooterColumn>
          )}

          <FooterColumn title="Ajuda">
            <Link to="/politicas" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Trocas e Devoluções</Link>
            <Link to="/politicas" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Prazos de Envio</Link>
            <Link to="/faq" className="text-sm text-[#FDF6F0]/70 hover:text-[#C06A35] transition-colors w-max">Perguntas Frequentes</Link>
          </FooterColumn>
          
          {/* SAC Block */}
          <div className="border-b border-[#C06A35]/20 md:border-none py-4 md:py-0">
            <h3 className="text-xs uppercase tracking-widest font-bold text-[#FDF6F0] mb-4">SAC</h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] text-[#FDF6F0]/50 uppercase tracking-wider mb-1">Atendimento WhatsApp</p>
                <p className="text-sm text-[#FDF6F0]/80 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#C06A35]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  (11) 98765-4321
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#FDF6F0]/50 uppercase tracking-wider mb-1">E-mail</p>
                <p className="text-sm text-[#FDF6F0]/80 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#C06A35]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  contato@palm.co
                </p>
              </div>
              <p className="text-[10px] text-[#FDF6F0]/50 leading-relaxed mt-2">
                De segunda à sexta, das 9h às 18h<br/>
                Sábados, das 9h às 13h
              </p>
            </div>
          </div>

        </div>

        {/* Social, Payments & Badges */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 py-8 border-t border-[#C06A35]/30">
          
          <div className="flex flex-col items-center md:items-start gap-4">
             <h4 className="text-[9px] uppercase tracking-[0.2em] text-[#FDF6F0]/50">Follow Us</h4>
             <div className="flex gap-4">
               {/* Social Icons SVGs */}
               <a href="#" className="w-8 h-8 rounded-full bg-[#FDF6F0]/5 flex items-center justify-center hover:bg-[#C06A35] transition-colors text-[#FDF6F0]">
                 <span className="sr-only">Instagram</span>
                 <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
               </a>
               <a href="#" className="w-8 h-8 rounded-full bg-[#FDF6F0]/5 flex items-center justify-center hover:bg-[#C06A35] transition-colors text-[#FDF6F0]">
                 <span className="sr-only">TikTok</span>
                 <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.26-1.13 4.41-2.91 5.75-1.74 1.3-4.04 1.75-6.15 1.23-2.09-.5-3.87-1.92-4.78-3.89-.92-1.95-.91-4.26.06-6.19.95-1.94 2.74-3.37 4.84-3.9 1.95-.5 4.04-.32 5.86.51.13-.88.1-1.78.11-2.66-.99-.33-2.05-.44-3.09-.32-1.93.22-3.72 1.23-4.87 2.78-1.17 1.54-1.64 3.52-1.34 5.43.28 1.9 1.34 3.6 2.87 4.67 1.54 1.08 3.51 1.45 5.37 1.06 1.86-.38 3.49-1.48 4.49-3.05.97-1.52 1.39-3.34 1.35-5.15-.05-5.28-.01-10.57-.02-15.85z"/></svg>
               </a>
             </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-4">
             <h4 className="text-[9px] uppercase tracking-[0.2em] text-[#FDF6F0]/50">Formas de Pagamento</h4>
             <div className="flex gap-2">
               {/* Simplified SVGs for payment methods */}
               <div className="h-6 px-3 bg-white rounded flex items-center justify-center opacity-80" title="Visa"><span className="text-[#1A332B] text-[10px] font-bold italic">VISA</span></div>
               <div className="h-6 px-3 bg-white rounded flex items-center justify-center opacity-80" title="Mastercard">
                 <div className="flex -space-x-1">
                   <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
                 </div>
               </div>
               <div className="h-6 px-3 bg-white rounded flex items-center justify-center opacity-80" title="Pix"><span className="text-[#32BCA4] text-[10px] font-bold">pix</span></div>
             </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-4">
             <h4 className="text-[9px] uppercase tracking-[0.2em] text-[#FDF6F0]/50">Certificados</h4>
             <div className="flex gap-3">
               <div className="h-8 px-2 border border-[#FDF6F0]/30 rounded flex items-center gap-1 opacity-70">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                   <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                 </svg>
                 <div className="flex flex-col"><span className="text-[7px] leading-none">SITE 100%</span><span className="text-[9px] font-bold leading-none">SEGURO</span></div>
               </div>
               <div className="h-8 px-2 border border-[#FDF6F0]/30 rounded flex items-center gap-1 opacity-70">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                   <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                 </svg>
                 <div className="flex flex-col"><span className="text-[7px] leading-none">GOOGLE</span><span className="text-[9px] font-bold leading-none">SAFE BROWSING</span></div>
               </div>
             </div>
          </div>
          
        </div>

        {/* Bottom Rights */}
        <div className="mt-8 pt-6 border-t border-[#C06A35]/30 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-[#FDF6F0]/50">
          <div className="text-center md:text-left space-y-1">
            <p className="tracking-widest uppercase">
              &copy; {new Date().getFullYear()} {BRAND_NAME.endsWith('.') ? BRAND_NAME : BRAND_NAME + '.'} Todos os direitos reservados.
            </p>
            <p>Funghi Brands - Palm Co. Moda e Acessórios - CNPJ 32.816.749/0001-06</p>
          </div>
          <p className="tracking-widest uppercase text-center md:text-right">
            Desenvolvido por <a href="https://www.apertef1.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-[#C06A35] transition-colors underline font-medium text-[#FDF6F0]">Aperte F1</a>
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
