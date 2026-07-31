import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';
import { isValidCPF } from '../utils/validators';

interface CheckoutProps {
  items: Product[];
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ items, onBack }) => {
  const { user } = useAuth();
  const { clearCart } = useStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success] = useState(false);
  const [preferenceId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Delivery states
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  
  const [shippingAddress, setShippingAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    phone: '',
    cpf: '',
    paymentMethod: 'pix' as 'pix' | 'credit_card'
  });

  // Calculate Shipping Helper
  const handleCalculateShipping = async (zip: string) => {
    const clean = zip.replace(/\D/g, '');
    if (!clean || clean.length < 8) return;
    
    setLoadingShipping(true);
    setShippingError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          toZip: clean,
          items: items
        })
      });
      const data = await response.json();
      if (data.error) {
        setShippingError(data.error);
        setShippingRates([]);
      } else {
        setShippingRates(data);
        if (data.length > 0) {
          // Escolhe automaticamente a opção mais barata
          const sorted = [...data].sort((a, b) => a.price - b.price);
          setSelectedRate(sorted[0]);
        }
      }
    } catch (err) {
      console.error(err);
      setShippingError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setLoadingShipping(false);
    }
  };

  // ViaCEP autocomplete
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Formatação visual do CEP: 00000-000
    const formatted = rawVal
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);

    setShippingAddress(prev => ({ ...prev, zipCode: formatted }));
    
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setShippingAddress(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
          handleCalculateShipping(clean);
        } else {
          setShippingError('CEP não encontrado.');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAddressId(id);
    if (id === 'new') {
      setShippingAddress({
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      });
      setSelectedRate(null);
      setShippingRates([]);
    } else {
      const addr = savedAddresses.find(a => a.id === id);
      if (addr) {
        const zipWithHyphen = addr.zip_code.replace(/(\d{5})(\d)/, '$1-$2');
        setShippingAddress({
          zipCode: zipWithHyphen,
          street: addr.street,
          number: addr.number,
          complement: addr.complement || '',
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
        });
        handleCalculateShipping(addr.zip_code);
      }
    }
  };

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
      
      const fetchProfileAndAddresses = async () => {
        const { data: profile } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            phone: profile.phone || '',
            cpf: profile.cpf || '',
          }));
        }

        const { data: addresses } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id);
        
        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
          const zipWithHyphen = defaultAddr.zip_code.replace(/(\d{5})(\d)/, '$1-$2');
          setShippingAddress({
            zipCode: zipWithHyphen,
            street: defaultAddr.street,
            number: defaultAddr.number,
            complement: defaultAddr.complement || '',
            neighborhood: defaultAddr.neighborhood,
            city: defaultAddr.city,
            state: defaultAddr.state,
          });
          handleCalculateShipping(defaultAddr.zip_code);
        }
      };
      
      fetchProfileAndAddresses();
    }
  }, [user]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = rawVal
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.cpf) {
        showToast('Por favor, preencha todos os campos de identificação.', 'warning');
        return;
      }
      if (!isValidCPF(formData.cpf)) {
        showToast('CPF inválido. Verifique os dígitos digitados.', 'error');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (
        !shippingAddress.zipCode ||
        !shippingAddress.street ||
        !shippingAddress.number ||
        !shippingAddress.neighborhood ||
        !shippingAddress.city ||
        !shippingAddress.state
      ) {
        showToast('Por favor, preencha todos os campos do endereço de entrega.', 'warning');
        return;
      }
      if (!selectedRate) {
        showToast('Por favor, selecione uma opção de envio.', 'warning');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shippingCost = selectedRate ? selectedRate.price : 0;
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return (subtotal * Number(appliedCoupon.discount_value)) / 100;
    } else {
      return Math.min(Number(appliedCoupon.discount_value), subtotal);
    }
  }, [appliedCoupon, subtotal]);

  const total = Math.max(0, subtotal + shippingCost - discountAmount);

  // Sincronização do Carrinho Abandonado
  const syncAbandonedCart = async () => {
    if (!items || items.length === 0) return;

    let sessionCartId = localStorage.getItem('littlepalm_cart_session_id');
    if (!sessionCartId) {
      sessionCartId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('littlepalm_cart_session_id', sessionCartId);
    }

    const cartItems = items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      size: item.size,
      imageUrl: item.imageUrl
    }));

    const customerInfo = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      shippingAddress: {
        zipCode: shippingAddress.zipCode,
        street: shippingAddress.street,
        number: shippingAddress.number,
        complement: shippingAddress.complement,
        neighborhood: shippingAddress.neighborhood,
        city: shippingAddress.city,
        state: shippingAddress.state,
        shippingService: selectedRate?.name || ''
      }
    };

    try {
      await supabase.from('abandoned_carts').upsert({
        id: sessionCartId,
        user_id: user?.id || null,
        cart_items: cartItems,
        customer_info: customerInfo,
        total_amount: total,
        status: 'abandoned'
      });
    } catch (err) {
      console.error('Erro ao sincronizar carrinho abandonado:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      syncAbandonedCart();
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, shippingAddress, selectedRate, items, appliedCoupon]);

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
    if (!selectedRate) {
      showToast('Selecione uma opção de frete para continuar.', 'warning');
      return;
    }
    setLoading(true);

    // Validação de estoque real no Supabase
    try {
      const itemIds = items.map(i => i.id);
      const { data: dbProducts, error: stockCheckError } = await supabase
        .from('products')
        .select('id, name, is_sold, stock_quantity')
        .in('id', itemIds);

      if (stockCheckError) {
        console.error('Erro ao verificar estoque real:', stockCheckError);
        showToast('Não foi possível verificar a disponibilidade do estoque. Por favor, tente novamente em instantes.', 'error');
        setLoading(false);
        return;
      }

      if (!dbProducts) {
        showToast('Erro ao consultar a disponibilidade dos produtos no banco de dados.', 'error');
        setLoading(false);
        return;
      }

      for (const item of items) {
        const found = dbProducts.find(p => p.id === item.id);
        if (!found) {
          showToast(`O produto "${item.name}" não está mais disponível em nosso catálogo.`, 'error');
          setLoading(false);
          return;
        }
        if (found.is_sold || (found.stock_quantity !== null && found.stock_quantity <= 0)) {
          showToast(`O produto "${found.name || item.name}" já foi vendido ou está esgotado.`, 'error');
          setLoading(false);
          return;
        }
      }
    } catch (stockErr) {
      console.error('Exceção ao validar estoque:', stockErr);
      showToast('Erro ao validar estoque dos produtos. Tente novamente em instantes.', 'error');
      setLoading(false);
      return;
    }

    // Sincronizar perfil do cliente
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
        phone: formData.phone,
        cpf: formData.cpf
      };

      if (profile?.id) {
        await supabase.from('customers').update(profilePayload).eq('id', profile.id);
      } else {
        await supabase.from('customers').insert(profilePayload);
      }

      // Se for endereço novo, salvar no catálogo do cliente
      if (selectedAddressId === 'new') {
        await supabase.from('addresses').insert({
          user_id: user.id,
          street: shippingAddress.street,
          number: shippingAddress.number,
          complement: shippingAddress.complement,
          neighborhood: shippingAddress.neighborhood,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip_code: shippingAddress.zipCode.replace(/\D/g, ''),
          is_default: savedAddresses.length === 0
        });
      }
    }

    // Criar pedido, itens e reserva de estoque em uma única transação no banco.
    const shippingDetails = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      cpf: formData.cpf,
      pickup: false,
      postalCode: shippingAddress.zipCode.replace(/\D/g, ''),
      street: shippingAddress.street,
      number: shippingAddress.number,
      complement: shippingAddress.complement,
      neighborhood: shippingAddress.neighborhood,
      city: shippingAddress.city,
      state: shippingAddress.state,
      shippingCost: shippingCost,
      shippingService: selectedRate?.name || ''
    };

    const { data: reservationRows, error: reservationError } = await supabase.rpc(
      'create_order_with_stock_reservation',
      {
        p_items: items.map(item => ({ product_id: item.id })),
        p_coupon_id: appliedCoupon?.id || null,
        p_shipping_cost: shippingCost,
        p_shipping_address: shippingDetails
      }
    );

    const reservation = Array.isArray(reservationRows)
      ? reservationRows[0]
      : reservationRows;

    if (reservationError || !reservation?.order_id || !reservation?.checkout_token) {
      console.error('Erro ao criar pedido e reservar estoque:', reservationError);
      const message = reservationError?.message?.includes('esgotado')
        ? reservationError.message
        : 'Não foi possível reservar os produtos. Atualize o carrinho e tente novamente.';
      showToast(message, 'error');
      setLoading(false);
      return;
    }

    const orderData = {
      id: reservation.order_id as string,
      checkoutToken: reservation.checkout_token as string
    };

    // Gerar preferência do Mercado Pago (com timeout de 10s)
    try {
      const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
      
      // Ajusta preço dos itens aplicando o desconto proporcionalmente
      const adjustedItems = items.map(item => ({
        ...item,
        price: Number((item.price * (1 - discountRatio)).toFixed(2))
      }));

      // Adiciona o frete como um item de serviço no Mercado Pago se houver
      if (shippingCost > 0) {
        adjustedItems.push({
          id: 'shipping_fee',
          name: `Frete: ${selectedRate?.name || 'Correios'}`,
          price: shippingCost,
          category: 'Outros',
          imageUrl: '',
          features: [],
          tagline: '',
          description: ''
        } as any);
      }

      const controller = new AbortController();
      // A Edge Function encerra a chamada externa em 10s. O navegador aguarda
      // um pouco mais para receber a resposta de timeout já formatada.
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-preference`, {
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
            orderId: orderData.id,
            origin: window.location.origin
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      const prefData = await response.json();
      if (response.ok && (prefData.init_point || prefData.sandbox_init_point)) {
         const redirectUrl = prefData.sandbox_init_point || prefData.init_point;
         const paymentExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
         const { data: paymentAttached, error: attachError } = await supabase.rpc(
           'attach_order_payment_url',
           {
             p_order_id: orderData.id,
             p_checkout_token: orderData.checkoutToken,
             p_payment_url: redirectUrl,
             p_expires_at: paymentExpiresAt
           }
         );

         if (attachError || paymentAttached !== true) {
           console.error('Não foi possível salvar a retomada do pagamento:', attachError);
           throw new Error('Não foi possível preparar a retomada do pagamento.');
         }
         
         // Marcar carrinho abandonado correspondente como recuperado
         try {
           const sessionCartId = localStorage.getItem('littlepalm_cart_session_id');
           if (sessionCartId) {
             await supabase
               .from('abandoned_carts')
               .update({
                 status: 'recovered',
                 order_id: orderData.id
               })
               .eq('id', sessionCartId);
             localStorage.removeItem('littlepalm_cart_session_id');
           }
         } catch (err) {
           console.error('Erro ao recuperar carrinho:', err);
         }

         clearCart();
         
         // Redirecionar para o Checkout do Mercado Pago
         window.location.href = redirectUrl;

      } else {
         const paymentError = prefData?.error?.message
           || prefData?.error
           || 'Não foi possível iniciar o pagamento.';
         throw new Error(paymentError);
      }
    } catch (err: any) {
      console.error("Erro completo no checkout:", err);
      let rollbackMessage = "";
      if (orderData?.id) {
         const { data: released, error: releaseError } = await supabase.rpc(
           'release_order_stock_reservation',
           {
             p_order_id: orderData.id,
             p_checkout_token: orderData.checkoutToken
           }
         );
         if (releaseError || released !== true) {
           console.error("Erro ao liberar a reserva do pedido:", releaseError);
           rollbackMessage = ' (A reserva será revisada automaticamente)';
         } else {
           rollbackMessage = " (Reserva de estoque liberada)";
         }
      }
      const errorMessage = err.name === 'AbortError'
        ? 'O pagamento demorou mais que o esperado. Por favor, tente novamente.'
        : (err.message || err);
      showToast(`Erro no processo de checkout: ${errorMessage}${rollbackMessage}`, 'error');
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

        {/* Step Progress Bar */}
        <div className="mb-14 flex items-center justify-between max-w-lg mx-auto lg:mx-0 border-b border-[#C06A35]/10 pb-6">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= 1 ? 'bg-[#1A332B] text-white shadow-md' : 'bg-[#EFEAE4] text-[#A8A29E]'}`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 ${currentStep >= 1 ? 'text-[#1A332B]' : 'text-[#A8A29E]'}`}>Identificação</span>
          </div>
          <div className={`flex-1 h-[2px] mx-4 transition-all duration-300 ${currentStep >= 2 ? 'bg-[#1A332B]' : 'bg-[#EFEAE4]'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= 2 ? 'bg-[#1A332B] text-white shadow-md' : 'bg-[#EFEAE4] text-[#A8A29E]'}`}>
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 ${currentStep >= 2 ? 'text-[#1A332B]' : 'text-[#A8A29E]'}`}>Entrega</span>
          </div>
          <div className={`flex-1 h-[2px] mx-4 transition-all duration-300 ${currentStep >= 3 ? 'bg-[#1A332B]' : 'bg-[#EFEAE4]'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= 3 ? 'bg-[#1A332B] text-white shadow-md' : 'bg-[#EFEAE4] text-[#A8A29E]'}`}>
              3
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 ${currentStep >= 3 ? 'text-[#1A332B]' : 'text-[#A8A29E]'}`}>Pagamento</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* Left Column: Step Content */}
          <div className="flex-1">
            <h1 className="text-3xl font-serif text-[#1A332B] mb-8">Finalizar Pedido</h1>
            
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Step 1: Identificação */}
              {currentStep === 1 && (
                <div className="space-y-8 animate-fade-in-up">
                  <div>
                    <h2 className="text-xl font-serif text-[#1A332B] mb-6">Informações de Contato & Identificação</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">E-mail</label>
                        <input 
                          required 
                          type="email" 
                          placeholder="Seu e-mail" 
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})} 
                          className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Nome</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Nome" 
                            value={formData.firstName} 
                            onChange={e => setFormData({...formData, firstName: e.target.value})} 
                            className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Sobrenome</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Sobrenome" 
                            value={formData.lastName} 
                            onChange={e => setFormData({...formData, lastName: e.target.value})} 
                            className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">WhatsApp / Telefone</label>
                          <input 
                            required 
                            type="tel" 
                            placeholder="(00) 00000-0000" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">CPF (Necessário para a entrega)</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="000.000.000-00" 
                            value={formData.cpf} 
                            onChange={handleCpfChange} 
                            className="w-full bg-transparent border-b border-[#C06A35] py-3 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="button"
                      onClick={handleNextStep}
                      className="w-full py-4 bg-[#1A332B] hover:bg-[#433E38] text-[#FDF6F0] uppercase tracking-widest text-xs font-bold transition-colors"
                    >
                      Prosseguir para Entrega
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Entrega & Frete */}
              {currentStep === 2 && (
                <div className="space-y-8 animate-fade-in-up">
                  <div>
                    <h2 className="text-xl font-serif text-[#1A332B] mb-6">Endereço de Entrega</h2>

                    <div className="space-y-6">
                      {/* Endereço Salvo (Seleção Rápida) */}
                      {user && savedAddresses.length > 0 && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Usar Endereço Salvo</label>
                          <select 
                            value={selectedAddressId} 
                            onChange={handleAddressSelect} 
                            className="w-full bg-white border border-[#C06A35]/30 rounded p-3 text-[#1A332B] text-sm focus:border-[#1A332B] outline-none"
                          >
                            {savedAddresses.map(addr => (
                              <option key={addr.id} value={addr.id}>
                                {addr.street}, {addr.number} ({addr.city} - {addr.state})
                              </option>
                            ))}
                            <option value="new">+ Cadastrar Novo Endereço</option>
                          </select>
                        </div>
                      )}

                      {/* Formulário de Endereço */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">CEP</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="00000-000" 
                              value={shippingAddress.zipCode} 
                              onChange={handleCepChange} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Número</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="Ex: 123" 
                              value={shippingAddress.number} 
                              onChange={e => setShippingAddress({...shippingAddress, number: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Rua / Logradouro</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="Rua..." 
                              value={shippingAddress.street} 
                              onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Complemento</label>
                            <input 
                              type="text" 
                              placeholder="Apto, Bloco, etc." 
                              value={shippingAddress.complement} 
                              onChange={e => setShippingAddress({...shippingAddress, complement: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Bairro</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="Bairro..." 
                              value={shippingAddress.neighborhood} 
                              onChange={e => setShippingAddress({...shippingAddress, neighborhood: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Cidade</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="Cidade..." 
                              value={shippingAddress.city} 
                              onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-1">Estado</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="UF" 
                              value={shippingAddress.state} 
                              onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} 
                              disabled={selectedAddressId !== 'new'}
                              className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors disabled:opacity-60" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Exibição dos Fretes Calculados */}
                      <div className="mt-8 border-t border-[#C06A35]/20 pt-6">
                        <h3 className="font-serif text-lg text-[#1A332B] mb-4">Escolha a Opção de Envio</h3>
                        
                        {loadingShipping ? (
                          <div className="flex items-center gap-3 text-[#A8A29E] py-4">
                            <svg className="animate-spin h-5 w-5 text-[#1A332B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Consultando taxas com SuperFrete...</span>
                          </div>
                        ) : shippingError ? (
                          <p className="text-sm text-red-700 py-2">{shippingError}</p>
                        ) : shippingRates.length === 0 ? (
                          <p className="text-sm text-[#A8A29E] py-2">Insira um CEP válido para calcular as opções de frete.</p>
                        ) : (
                          <div className="space-y-3">
                            {shippingRates.map(rate => (
                              <label 
                                key={rate.id} 
                                onClick={() => setSelectedRate(rate)}
                                className={`flex items-center justify-between p-4 border rounded cursor-pointer transition-all duration-300 ${selectedRate?.id === rate.id ? 'border-[#1A332B] bg-[#1A332B]/5' : 'border-[#C06A35]/20 hover:border-[#C06A35]'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="radio" 
                                    name="shipping_rate" 
                                    checked={selectedRate?.id === rate.id} 
                                    onChange={() => setSelectedRate(rate)}
                                    className="accent-[#1A332B]" 
                                  />
                                  <div>
                                    <span className="font-medium text-[#1A332B] block">{rate.name}</span>
                                    <span className="text-xs text-[#A8A29E]">Prazo de entrega: {rate.delivery_time} {rate.delivery_time > 1 ? 'dias úteis' : 'dia útil'}</span>
                                  </div>
                                </div>
                                <span className="font-serif text-[#1A332B] font-medium">R$ {rate.price.toFixed(2).replace('.', ',')}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={handlePrevStep}
                      className="flex-1 py-4 border border-[#1A332B] text-[#1A332B] hover:bg-[#1A332B]/5 uppercase tracking-widest text-xs font-bold transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      type="button"
                      onClick={handleNextStep}
                      disabled={!selectedRate}
                      className="flex-1 py-4 bg-[#1A332B] hover:bg-[#433E38] text-[#FDF6F0] uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Prosseguir para Pagamento
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Resumo & Pagamento */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-fade-in-up">
                  <div>
                    <h2 className="text-xl font-serif text-[#1A332B] mb-6">Pagamento Seguro (Mercado Pago)</h2>
                    <div className="p-6 border border-[#C06A35]/30 bg-white space-y-4 rounded-sm">
                      <p className="text-sm text-[#423226] leading-relaxed">
                        Ao clicar em finalizar, você será redirecionado para o ambiente seguro do **Mercado Pago** para escolher sua forma de pagamento preferida:
                      </p>
                      <ul className="text-xs text-[#423226] space-y-2 pl-4 list-disc">
                        <li><strong>PIX:</strong> Confirmação imediata e preparação de envio mais rápida.</li>
                        <li><strong>Cartão de Crédito:</strong> Parcelamento disponível conforme taxas vigentes.</li>
                        <li><strong>Boleto Bancário:</strong> Vencimento em até 3 dias úteis.</li>
                      </ul>
                    </div>

                    <div className="mt-8 border border-[#C06A35]/20 p-6 bg-[#FAF9F6] rounded-sm space-y-4">
                      <h3 className="text-xs uppercase tracking-widest text-[#A8A29E] font-bold">Resumo de Entrega</h3>
                      <div className="text-sm text-[#423226] space-y-1">
                        <p><strong>Destinatário:</strong> {formData.firstName} {formData.lastName}</p>
                        <p><strong>CPF:</strong> {formData.cpf}</p>
                        <p><strong>Telefone:</strong> {formData.phone}</p>
                        <p className="border-t border-[#C06A35]/10 pt-2 mt-2">
                          <strong>Endereço:</strong> {shippingAddress.street}, {shippingAddress.number}
                          {shippingAddress.complement && ` - ${shippingAddress.complement}`} ({shippingAddress.neighborhood}, {shippingAddress.city} - {shippingAddress.state})
                        </p>
                        <p><strong>Opção de Envio:</strong> {selectedRate?.name} (R$ {selectedRate?.price.toFixed(2).replace('.', ',')})</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={handlePrevStep}
                      disabled={loading}
                      className="flex-1 py-4 border border-[#1A332B] text-[#1A332B] hover:bg-[#1A332B]/5 uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading || items.length === 0 || !selectedRate}
                      className="flex-[2] py-4 bg-[#1A332B] hover:bg-[#433E38] text-[#FDF6F0] uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Redirecionando...' : `Finalizar no Mercado Pago — R$ ${total.toFixed(2).replace('.', ',')}`}
                    </button>
                  </div>
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
                 <span>{selectedRate ? `R$ ${selectedRate.price.toFixed(2).replace('.', ',')}` : 'A calcular'}</span>
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
