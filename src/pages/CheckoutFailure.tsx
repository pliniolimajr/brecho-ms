import { useNavigate } from 'react-router-dom';

export function CheckoutFailure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] flex flex-col items-center justify-center text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-4xl font-serif text-[#1A332B] mb-4">Pagamento Recusado</h1>
      <p className="text-[#423226] max-w-md mb-8">
        Houve um problema ao processar o seu pagamento no Mercado Pago. Nenhuma cobrança foi realizada. Você pode tentar novamente com outra forma de pagamento.
      </p>

      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/checkout')} 
          className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38] transition-colors"
        >
          Tentar Novamente
        </button>
        <button 
          onClick={() => navigate('/')} 
          className="border border-[#1A332B] text-[#1A332B] px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#1A332B]/5 transition-colors"
        >
          Ir para a Home
        </button>
      </div>
    </div>
  );
}

export default CheckoutFailure;
