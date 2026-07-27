import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import { Navigate, useNavigate } from 'react-router-dom';

export function CustomerProfile() {
  const { session, user, loading, supabase: sb } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'wishlist' | 'addresses'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Address states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null); // null means list view, empty or containing object means form view
  const [addressForm, setAddressForm] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    isDefault: false
  });

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchCustomerProfile();
      fetchWishlist();
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) {
      setAddresses(data);
    }
    setLoadingAddresses(false);
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    if (cep.length > 8) cep = cep.slice(0, 8);
    
    if (cep.length > 5) {
      cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }
    setAddressForm(prev => ({ ...prev, zipCode: cep }));

    const cleanCep = cep.replace('-', '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddressForm(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP', err);
      }
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const payload = {
      user_id: user.id,
      zip_code: addressForm.zipCode,
      street: addressForm.street,
      number: addressForm.number,
      complement: addressForm.complement,
      neighborhood: addressForm.neighborhood,
      city: addressForm.city,
      state: addressForm.state,
      is_default: addressForm.isDefault
    };

    if (payload.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    let query;
    if (editingAddress?.id) {
      query = supabase.from('addresses').update(payload).eq('id', editingAddress.id);
    } else {
      query = supabase.from('addresses').insert(payload);
    }

    const { error } = await query;
    if (error) {
      alert('Erro ao salvar endereço: ' + error.message);
    } else {
      setEditingAddress(null);
      fetchAddresses();
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    if (!user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', addrId);
    if (error) {
      alert('Erro ao definir endereço padrão: ' + error.message);
    } else {
      fetchAddresses();
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (window.confirm('Deseja realmente remover este endereço?')) {
      const { error } = await supabase.from('addresses').delete().eq('id', addrId);
      if (error) {
        alert('Erro ao deletar endereço: ' + error.message);
      } else {
        fetchAddresses();
      }
    }
  };

  const startEditAddress = (addr: any) => {
    setEditingAddress(addr);
    setAddressForm({
      zipCode: addr.zip_code || '',
      street: addr.street || '',
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      isDefault: addr.is_default || false
    });
  };

  const startCreateAddress = () => {
    setEditingAddress({});
    setAddressForm({
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      isDefault: false
    });
  };

  const fetchCustomerProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCustomer(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPhone(data.phone || '');
      setCpf(data.cpf || '');
      setBirthDate(data.birth_date || '');
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ 
          user_id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || ''
        })
        .select()
        .single();
      if (newCustomer) {
        setCustomer(newCustomer);
        setFirstName(newCustomer.first_name || '');
        setLastName(newCustomer.last_name || '');
        setPhone(newCustomer.phone || '');
        setCpf(newCustomer.cpf || '');
        setBirthDate(newCustomer.birth_date || '');
      }
    }
  };

  const fetchWishlist = async () => {
    if (!user) return;
    setLoadingWishlist(true);
    const { data } = await supabase
      .from('wishlists')
      .select('*, products(*)')
      .eq('user_id', user.id);
    if (data) {
      setWishlist(data);
    }
    setLoadingWishlist(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const payload = {
      user_id: user!.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      cpf,
      birth_date: birthDate || null,
    };
    
    let query;
    if (customer?.id) {
      query = supabase.from('customers').update(payload).eq('id', customer.id);
    } else {
      query = supabase.from('customers').insert(payload);
    }

    const { error } = await query;
    if (error) {
      alert('Erro ao salvar dados: ' + error.message);
    } else {
      alert('Dados salvos com sucesso!');
      fetchCustomerProfile();
    }
    setSavingProfile(false);
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    await supabase.from('wishlists').delete().eq('id', wishlistId);
    fetchWishlist();
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(price, products(name, image_url, size))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
      
    if (data) {
      setOrders(data);
    }
    setLoadingOrders(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FDF6F0] flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await sb.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-24 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-end border-b border-[#C06A35]/30 pb-4">
          <div>
            <h1 className="text-4xl font-serif text-[#1A332B] mb-2">Minha Conta</h1>
            <p className="text-[#423226]">Olá, {user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium uppercase tracking-widest text-[#C06A35] hover:text-[#1A332B] underline underline-offset-4"
          >
            Sair
          </button>
        </header>

        {/* Tabs Switcher */}
        <div className="flex gap-6 mb-8 border-b border-[#C06A35]/20 pb-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'orders' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
          >
            Meus Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
          >
            Dados Pessoais
          </button>
          <button 
            onClick={() => setActiveTab('wishlist')}
            className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'wishlist' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
          >
            Lista de Desejos
          </button>
          <button 
            onClick={() => setActiveTab('addresses')}
            className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'addresses' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
          >
            Meus Endereços
          </button>
        </div>

        {activeTab === 'orders' && (
          <section>
            <h2 className="text-2xl font-serif text-[#1A332B] mb-6">Meus Pedidos</h2>
            
            {loadingOrders ? (
              <p className="text-[#A8A29E]">Buscando pedidos...</p>
            ) : orders.length === 0 ? (
              <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 text-center">
                <p className="text-[#423226] mb-4">Você ainda não fez nenhum pedido na Little Palm Co.</p>
                <button 
                  onClick={() => navigate('/catalogo')}
                  className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 uppercase tracking-widest text-sm hover:bg-[#433E38]"
                >
                  Começar a Comprar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
                    {/* Order Header */}
                    <div 
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="p-6 flex justify-between items-center flex-wrap gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">
                          Pedido em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="font-mono text-sm text-[#423226]">{order.id.split('-')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">Status</span>
                        <span className="text-sm font-medium text-[#1A332B]">
                          {order.status === 'pending' && 'Aguardando Pagamento'}
                          {order.status === 'paid' && 'Pronto para Retirada'}
                          {order.status === 'shipped' && 'Enviado'}
                          {order.status === 'delivered' && 'Entregue / Retirado'}
                          {order.status === 'cancelled' && 'Cancelado'}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="block text-xs text-[#A8A29E] uppercase tracking-widest mb-1">Total</span>
                          <span className="font-serif text-lg text-[#1A332B]">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Order Items (Expanded) */}
                    {expandedOrderId === order.id && (
                      <div className="border-t border-[#C06A35]/10 bg-gray-50 p-6 space-y-4">
                        <h4 className="text-xs uppercase tracking-widest text-[#423226] font-bold mb-4">Produtos neste pedido</h4>
                        {order.order_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-4 border-b border-[#C06A35]/10 pb-4 last:border-0 last:pb-0">
                            <img src={item.products?.image_url} alt={item.products?.name} className="w-16 h-16 object-cover rounded" />
                            <div className="flex-1">
                              <p className="font-serif text-[#1A332B]">{item.products?.name}</p>
                              <p className="text-xs text-[#A8A29E]">Tamanho: {item.products?.size}</p>
                            </div>
                            <div className="font-medium text-[#1A332B]">
                              R$ {Number(item.price).toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 mt-4 border-t border-[#C06A35]/10 text-xs text-[#423226]">
                          Forma de Pagamento: <strong className="uppercase">{order.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito'}</strong><br/>
                          Retirada presencial combinada.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 max-w-lg space-y-6">
            <h2 className="text-2xl font-serif text-[#1A332B] mb-2">Dados Pessoais</h2>
            <p className="text-sm text-gray-500 mb-6">Mantenha seus dados atualizados para facilitar na hora da compra e retirada de produtos.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Nome</label>
                <input 
                  type="text" 
                  placeholder="Nome" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                  className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Sobrenome</label>
                <input 
                  type="text" 
                  placeholder="Sobrenome" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                  className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Telefone de Contato</label>
              <input 
                type="text" 
                placeholder="(00) 00000-0000" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">CPF</label>
              <input 
                type="text" 
                placeholder="000.000.000-00" 
                value={cpf} 
                onChange={e => setCpf(e.target.value)} 
                className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Data de Nascimento</label>
              <input 
                type="date" 
                value={birthDate} 
                onChange={e => setBirthDate(e.target.value)} 
                className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
              />
            </div>
            <button 
              type="submit" 
              disabled={savingProfile}
              className="bg-[#1A332B] text-white px-8 py-3 rounded uppercase tracking-widest text-sm hover:bg-[#433E38] disabled:opacity-50 transition-colors"
            >
              {savingProfile ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </form>
        )}

        {activeTab === 'wishlist' && (
          <div>
            <h2 className="text-2xl font-serif text-[#1A332B] mb-6">Lista de Desejos</h2>
            {loadingWishlist ? (
              <p className="text-[#A8A29E]">Carregando lista...</p>
            ) : wishlist.length === 0 ? (
              <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 text-center">
                <p className="text-[#423226] mb-4">Você ainda não tem nenhum item na sua lista de desejos.</p>
                <button 
                  onClick={() => navigate('/catalogo')}
                  className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 uppercase tracking-widest text-sm hover:bg-[#433E38]"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wishlist.map(item => {
                  const prod = item.products;
                  if (!prod) return null;
                  return (
                    <div key={item.id} className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 flex gap-6 align-top">
                      <img 
                        src={prod.image_url} 
                        alt={prod.name} 
                        className="w-20 h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => navigate(`/produto/${prod.id}`)} 
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 
                            className="font-serif text-xl text-[#1A332B] cursor-pointer hover:underline" 
                            onClick={() => navigate(`/produto/${prod.id}`)}
                          >
                            {prod.name}
                          </h3>
                          <p className="text-xs text-[#A8A29E] mt-1">Tamanho: {prod.size || 'Único'}</p>
                          <p className="text-sm font-semibold text-[#1A332B] mt-2">
                            R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="text-xs text-red-600 underline text-left mt-4"
                        >
                          Remover da Lista
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'addresses' && editingAddress !== null && (
          <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 max-w-lg">
            <h2 className="text-2xl font-serif text-[#1A332B] mb-6">
              {editingAddress.id ? 'Editar Endereço' : 'Novo Endereço'}
            </h2>
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">CEP *</label>
                  <input 
                    type="text" 
                    placeholder="00000-000" 
                    value={addressForm.zipCode} 
                    onChange={handleZipCodeChange} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Número *</label>
                  <input 
                    type="text" 
                    placeholder="123" 
                    value={addressForm.number} 
                    onChange={e => setAddressForm(prev => ({ ...prev, number: e.target.value }))} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Rua *</label>
                <input 
                  type="text" 
                  placeholder="Nome da Rua" 
                  value={addressForm.street} 
                  onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))} 
                  className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Bairro *</label>
                  <input 
                    type="text" 
                    placeholder="Bairro" 
                    value={addressForm.neighborhood} 
                    onChange={e => setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Complemento</label>
                  <input 
                    type="text" 
                    placeholder="Apto, Bloco..." 
                    value={addressForm.complement} 
                    onChange={e => setAddressForm(prev => ({ ...prev, complement: e.target.value }))} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Cidade *</label>
                  <input 
                    type="text" 
                    placeholder="Cidade" 
                    value={addressForm.city} 
                    onChange={e => setAddressForm(prev => ({ ...prev, city: e.target.value }))} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#423226] uppercase tracking-wider">Estado *</label>
                  <input 
                    type="text" 
                    placeholder="UF" 
                    value={addressForm.state} 
                    onChange={e => setAddressForm(prev => ({ ...prev, state: e.target.value }))} 
                    className="w-full bg-transparent border-b border-[#C06A35] py-2 text-[#1A332B] outline-none focus:border-[#1A332B]"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  id="isDefault"
                  type="checkbox" 
                  checked={addressForm.isDefault} 
                  onChange={e => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))} 
                  className="cursor-pointer accent-[#1A332B]"
                />
                <label htmlFor="isDefault" className="text-sm text-[#423226] cursor-pointer select-none">
                  Definir como endereço principal
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="bg-[#1A332B] text-white px-6 py-2 rounded uppercase tracking-widest text-sm hover:bg-[#433E38] transition-colors"
                >
                  Salvar
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingAddress(null)}
                  className="border border-[#C06A35] text-[#C06A35] px-6 py-2 rounded uppercase tracking-widest text-sm hover:bg-[#FDF6F0] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'addresses' && editingAddress === null && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-[#1A332B]">Meus Endereços</h2>
              <button 
                onClick={startCreateAddress}
                className="bg-[#1A332B] text-white px-4 py-2 uppercase tracking-widest text-xs hover:bg-[#433E38] transition-colors"
              >
                Novo Endereço
              </button>
            </div>

            {loadingAddresses ? (
              <p className="text-[#A8A29E]">Carregando endereços...</p>
            ) : addresses.length === 0 ? (
              <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 text-center">
                <p className="text-[#423226] mb-4">Você ainda não tem nenhum endereço cadastrado.</p>
                <button 
                  onClick={startCreateAddress}
                  className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 uppercase tracking-widest text-sm hover:bg-[#433E38]"
                >
                  Cadastrar Primeiro Endereço
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map(addr => (
                  <div 
                    key={addr.id} 
                    className={`bg-white p-6 rounded shadow-sm border ${addr.is_default ? 'border-[#1A332B] ring-1 ring-[#1A332B]' : 'border-[#C06A35]/20'} flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-bold text-[#1A332B] uppercase tracking-wider">
                          {addr.is_default ? 'Principal' : 'Secundário'}
                        </span>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => startEditAddress(addr)}
                            className="text-xs text-[#C06A35] hover:text-[#1A332B] underline"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#423226]">
                        {addr.street}, {addr.number} {addr.complement && `- ${addr.complement}`}
                      </p>
                      <p className="text-sm text-[#423226]">{addr.neighborhood}</p>
                      <p className="text-sm text-[#423226]">{addr.city} - {addr.state}</p>
                      <p className="text-xs text-[#A8A29E] mt-2">CEP: {addr.zip_code}</p>
                    </div>

                    {!addr.is_default && (
                      <button 
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-xs text-[#1A332B] border border-[#1A332B] px-3 py-1.5 rounded uppercase tracking-wider font-semibold mt-4 hover:bg-gray-50 transition-colors text-center"
                      >
                        Definir como Principal
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
