import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Inicialize com a Public Key (pode usar uma variável de ambiente ou de teste por enquanto)
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'APP_USR-00000000000-00000-00000000-0000000', { locale: 'pt-BR' });

interface CheckoutProps {
  items: Product[];
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, onBack }) => {
  const { user } = useAuth();
  const { clearCart } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    phone: '',
    paymentMethod: 'pix' as 'pix' | 'credit_card'
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
      
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setFormData(prev => ({
            ...prev,
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            phone: data.phone || '',
          }));
        }
      };
      
      fetchProfile();
    }
  }, [user]);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shipping = 0; // Free shipping mock
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return (subtotal * Number(appliedCoupon.discount_value)) / 100;
    } else {
      return Math.min(Number(appliedCoupon.discount_value), subtotal);
    }
  }, [appliedCoupon, subtotal]);

  const total = Math.max(0, subtotal + shipping - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setCouponError('Cupom inválido ou expirado.');
      return;
    }

    if (subtotal < Number(data.min_purchase_amount)) {
      setCouponError(`O valor mínimo para usar este cupom é R$ ${Number(data.min_purchase_amount).toFixed(2).replace('.', ',')}`);
      return;
    }

    const now = new Date();
    if (data.valid_until && new Date(data.valid_until) < now) {
      setCouponError('Este cupom já expirou.');
      return;
    }
    if (data.valid_from && new Date(data.valid_from) > now) {
      setCouponError('Este cupom ainda não é válido.');
      return;
    }

    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      setCouponError('Este cupom atingiu o limite máximo de usos.');
      return;
    }

    setAppliedCoupon(data);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);

    // Sincronizar dados digitados com o perfil do cliente
    if (user) {
      const { data: profile } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const profilePayload = {
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone
      };

      if (profile?.id) {
        await supabase.from('customers').update(profilePayload).eq('id', profile.id);
      } else {
        await supabase.from('customers').insert(profilePayload);
      }
    }

    // 1. Criar o pedido (Order)
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      user_id: user?.id || null,
      status: 'pending',
      total_amount: total,
      payment_method: formData.paymentMethod,
      coupon_id: appliedCoupon?.id || null,
      discount_amount: discountAmount,
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

    // Incrementar uso do cupom se aplicável
    if (appliedCoupon) {
      await supabase.rpc('increment_coupon_uses', { coupon_id: appliedCoupon.id });
    }

    // 3. Gerar Preferência do Mercado Pago
    try {
      const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
      const adjustedItems = items.map(item => ({
        ...item,
        price: Number((item.price * (1 - discountRatio)).toFixed(2))
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          items: adjustedItems,
          payer: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName
          },
          orderId: orderData.id // Para o webhook
        })
      });
      
      const prefData = await response.json();
      if (prefData.id) {
         setPreferenceId(prefData.id);
         
         // Marcar produtos como pendentes ou aguardar o webhook.
         // Aqui, para simplificar o MVP, marcamos como vendidos para reservar.
         for (const item of items) {
           await supabase.from('products').update({ is_sold: true }).eq('id', item.id);
         }
         
         clearCart();
         setSuccess(true);
      } else {
         throw new Error(prefData.error || 'Erro ao gerar pagamento');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação com o Mercado Pago. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-serif text-[#1A332B] mb-4">Pedido Realizado!</h1>
        <p className="text-[#423226] mb-8">Obrigado pela sua compra. Seu pedido foi recebido e seus produtos estão reservados para você.</p>
        <button onClick={onBack} className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38]">
          Continuar Comprando
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
                <p className="text-sm text-[#423226] mb-4">No momento, não estamos realizando envios. Seus produtos estarão reservados para retirada presencial após a confirmação do pagamento.</p>
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
                   <p className="text-sm text-[#423226] mb-4">Escolha a forma de pagamento e finalize com segurança.</p>
                   {preferenceId ? (
                     <div className="mt-4">
                        <Wallet initialization={{ preferenceId }} />
                     </div>
                   ) : (
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
                   )}
                </div>
              </div>

              {!preferenceId && (
                <div>
                  <button 
                      type="submit"
                      disabled={loading || items.length === 0}
                      className="w-full py-5 bg-[#1A332B] hover:bg-[#433E38] text-[#FDF6F0] uppercase tracking-widest text-sm font-medium transition-colors disabled:opacity-50"
                  >
                      {loading ? 'Processando...' : `Confirmar Pedido — R$ ${total.toFixed(2).replace('.', ',')}`}
                  </button>
                </div>
              )}
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-800 font-medium">
                   <span>Desconto ({appliedCoupon?.code})</span>
                   <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[#423226]">
                 <span>Frete</span>
                 <span>Grátis</span>
              </div>
            </div>

            {/* Coupon Field */}
            <div className="border-t border-[#C06A35] mt-6 pt-6 space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="CUPOM DE DESCONTO" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon || preferenceId !== null}
                  className="flex-1 bg-transparent border border-[#C06A35] p-2 text-sm text-[#1A332B] placeholder-[#A8A29E] outline-none uppercase tracking-widest font-medium focus:border-[#1A332B] disabled:opacity-50"
                />
                {appliedCoupon ? (
                  <button 
                    type="button" 
                    onClick={handleRemoveCoupon}
                    disabled={preferenceId !== null}
                    className="bg-red-800 text-white px-4 py-2 text-xs font-medium uppercase tracking-widest hover:bg-red-950 transition-colors disabled:opacity-50"
                  >
                    Remover
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleApplyCoupon}
                    disabled={preferenceId !== null || !couponCode.trim()}
                    className="bg-[#1A332B] text-white px-4 py-2 text-xs font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                )}
              </div>
              {couponError && <p className="text-xs text-red-700">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-xs text-green-800 font-medium">
                  Cupom {appliedCoupon.code} aplicado!
                </p>
              )}
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