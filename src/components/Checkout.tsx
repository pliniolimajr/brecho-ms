import React, { useState } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';

interface CheckoutProps {
  items: Product[];
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, onBack }) => {
  const { user } = useAuth();
  const { clearCart } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    phone: '',
    paymentMethod: 'pix' as 'pix' | 'credit_card'
  });
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shipping = 0; // Free shipping mock
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);

    // 1. Criar o pedido (Order)
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      user_id: user?.id || null,
      status: 'pending',
      total_amount: total,
      payment_method: formData.paymentMethod,
      shipping_address: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        pickup: true
      }
    }).select().single();

    if (orderError || !orderData) {
      console.error(orderError);
      alert('Erro ao processar pedido. Tente novamente.');
      setLoading(false);
      return;
    }

    // 2. Criar os itens do pedido
    const orderItems = items.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      price: item.price
    }));

    await supabase.from('order_items').insert(orderItems);

    // 3. Marcar produtos como vendidos (opcional, dependendo da regra de negócio, geralmente fazemos isso após o pagamento)
    // Para simplificar, vamos travar a peça assim que o pedido é feito.
    for (const item of items) {
      await supabase.from('products').update({ is_sold: true }).eq('id', item.id);
    }

    // 4. Limpar carrinho e mostrar sucesso
    clearCart();
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-serif text-[#1A332B] mb-4">Pedido Realizado!</h1>
        <p className="text-[#423226] mb-8">Obrigado pela sua compra. Seu pedido foi recebido e a peça está reservada para você.</p>
        <button onClick={onBack} className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38]">
          Continuar Garimpando
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#1A332B] transition-colors mb-12"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para a Loja
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* Left Column: Form */}
          <div className="flex-1">
            <h1 className="text-3xl font-serif text-[#1A332B] mb-4">Finalizar Pedido</h1>
            
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Section 1: Contact */}
              <div>
                <h2 className="text-xl font-serif text-[#1A332B] mb-6">Informações de Contato</h2>
                <div className="space-y-4">
                   <input required type="email" placeholder="Seu e-mail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" />
                </div>
              </div>

              {/* Section 2: Shipping */}
              <div>
                <h2 className="text-xl font-serif text-[#1A332B] mb-6">Retirada na Loja</h2>
                <p className="text-sm text-[#423226] mb-4">No momento, não estamos realizando envios. Suas peças estarão reservadas para retirada presencial após a confirmação do pagamento.</p>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="Nome" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" />
                      <input required type="text" placeholder="Sobrenome" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" />
                   </div>
                   <input required type="tel" placeholder="WhatsApp / Telefone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" />
                </div>
              </div>

               {/* Section 3: Payment */}
              <div>
                <h2 className="text-xl font-serif text-[#1A332B] mb-6">Pagamento (Mercado Pago)</h2>
                <div className="p-6 border border-[#C06A35] bg-white/50 space-y-4">
                   <p className="text-sm text-[#423226] mb-4">Escolha a forma de pagamento. (Ambiente de Integração)</p>
                   
                   <div className="flex gap-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" name="payment" value="pix" checked={formData.paymentMethod === 'pix'} onChange={() => setFormData({...formData, paymentMethod: 'pix'})} className="accent-[#1A332B]" />
                       <span>PIX</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" name="payment" value="credit_card" checked={formData.paymentMethod === 'credit_card'} onChange={() => setFormData({...formData, paymentMethod: 'credit_card'})} className="accent-[#1A332B]" />
                       <span>Cartão de Crédito</span>
                     </label>
                   </div>
                </div>
              </div>

              <div>
                <button 
                    type="submit"
                    disabled={loading || items.length === 0}
                    className="w-full py-5 bg-[#1A332B] hover:bg-[#433E38] text-[#FDF6F0] uppercase tracking-widest text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Processando...' : `Confirmar Pedido — R$ ${total.toFixed(2).replace('.', ',')}`}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:pl-12 lg:border-l border-[#C06A35]">
            <h2 className="text-xl font-serif text-[#1A332B] mb-8">Resumo do Pedido</h2>
            
            <div className="space-y-6 mb-8">
               {items.map((item, idx) => (
                 <div key={idx} className="flex gap-4">
                    <div className="w-16 h-16 bg-[#F4E4D4] relative">
                       <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                       <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1A332B] text-white text-[10px] flex items-center justify-center rounded-full">1</span>
                    </div>
                    <div className="flex-1">
                       <h3 className="font-serif text-[#1A332B] text-base">{item.name}</h3>
                       <p className="text-xs text-[#A8A29E]">{item.category}</p>
                    </div>
                    <span className="text-sm text-[#423226]">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                 </div>
               ))}
            </div>

            <div className="border-t border-[#C06A35] pt-6 space-y-2">
              <div className="flex justify-between text-sm text-[#423226]">
                 <span>Subtotal</span>
                 <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-sm text-[#423226]">
                 <span>Frete</span>
                 <span>Grátis</span>
              </div>
            </div>
            
            <div className="border-t border-[#C06A35] mt-6 pt-6">
               <div className="flex justify-between items-center">
                 <span className="font-serif text-xl text-[#1A332B]">Total</span>
                 <div className="flex items-end gap-2">
                   <span className="text-xs text-[#A8A29E] mb-1">BRL</span>
                   <span className="font-serif text-2xl text-[#1A332B]">R$ {total.toFixed(2).replace('.', ',')}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;