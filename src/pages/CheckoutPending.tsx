import { useNavigate } from 'react-router-dom';

export function CheckoutPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] flex flex-col items-center justify-center text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-amber-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-4xl font-serif text-[#1A332B] mb-4">Pagamento Pendente</h1>
      <p className="text-[#423226] max-w-md mb-8">
        O seu pagamento está sendo processado pelo Mercado Pago. Assim que a transação for concluída, você receberá uma confirmação por e-mail e o status será atualizado.
      </p>

      <button 
        onClick={() => navigate('/minha-conta')} 
        className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38] transition-colors"
      >
        Acompanhar Pedido
      </button>
    </div>
  );
}

export default CheckoutPending;
