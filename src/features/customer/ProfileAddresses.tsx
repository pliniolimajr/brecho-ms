import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface ProfileAddressesProps {
  user: User | null;
}

export function ProfileAddresses({ user }: ProfileAddressesProps) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
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
    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAddresses(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar endereços:', err.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="bg-white p-8 md:p-10 rounded border border-[#C06A35]/20 animate-fade-in-up min-h-[400px]">
      
      {editingAddress !== null ? (
        // FORMULÁRIO DE EDIÇÃO / CRIAÇÃO
        <div>
          <h2 className="text-xl font-serif text-[#1A332B] mb-8 italic border-b border-[#C06A35]/20 pb-4">
            {editingAddress.id ? 'Editar Endereço' : 'Novo Endereço'}
          </h2>
          
          <form onSubmit={handleSaveAddress} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">CEP *</label>
                <input 
                  type="text" 
                  placeholder="00000-000" 
                  value={addressForm.zipCode} 
                  onChange={handleZipCodeChange} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">Número *</label>
                <input 
                  type="text" 
                  placeholder="123" 
                  value={addressForm.number} 
                  onChange={e => setAddressForm(prev => ({ ...prev, number: e.target.value }))} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1A332B]">Rua *</label>
              <input 
                type="text" 
                placeholder="Nome da Rua" 
                value={addressForm.street} 
                onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))} 
                className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">Bairro *</label>
                <input 
                  type="text" 
                  placeholder="Bairro" 
                  value={addressForm.neighborhood} 
                  onChange={e => setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">Complemento</label>
                <input 
                  type="text" 
                  placeholder="Apto, Bloco..." 
                  value={addressForm.complement} 
                  onChange={e => setAddressForm(prev => ({ ...prev, complement: e.target.value }))} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">Cidade *</label>
                <input 
                  type="text" 
                  placeholder="Cidade" 
                  value={addressForm.city} 
                  onChange={e => setAddressForm(prev => ({ ...prev, city: e.target.value }))} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1A332B]">Estado *</label>
                <input 
                  type="text" 
                  placeholder="UF" 
                  value={addressForm.state} 
                  onChange={e => setAddressForm(prev => ({ ...prev, state: e.target.value }))} 
                  className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
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
                className="cursor-pointer w-4 h-4 accent-[#1A332B]"
              />
              <label htmlFor="isDefault" className="text-sm text-[#423226] cursor-pointer select-none">
                Definir como endereço principal
              </label>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-100">
              <button 
                type="submit" 
                className="bg-[#1A332B] text-white px-8 py-2.5 uppercase tracking-widest text-sm font-semibold hover:bg-[#433E38] transition-colors"
              >
                Salvar
              </button>
              <button 
                type="button" 
                onClick={() => setEditingAddress(null)}
                className="border border-[#C06A35] text-[#C06A35] px-8 py-2.5 uppercase tracking-widest text-sm font-semibold hover:bg-[#FDF6F0] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        // LISTA DE ENDEREÇOS
        <div>
          <div className="flex justify-between items-center mb-8 border-b border-[#C06A35]/20 pb-4">
            <h2 className="text-xl font-serif text-[#1A332B] italic">Meus endereços</h2>
            <button 
              onClick={startCreateAddress}
              className="text-sm uppercase tracking-widest text-[#C06A35] font-semibold hover:text-[#1A332B] transition-colors"
            >
              + Novo Endereço
            </button>
          </div>
          
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-10">Carregando endereços...</div>
          ) : addresses.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10 border border-dashed border-gray-200 rounded p-6">
              <p>Você ainda não possui endereços cadastrados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map(addr => (
                <div key={addr.id} className="p-6 border border-gray-100 bg-gray-50/50 rounded flex flex-col relative group">
                  {addr.is_default && (
                    <span className="absolute top-4 right-4 text-[10px] uppercase bg-[#1A332B] text-white px-2 py-1 rounded-sm">Principal</span>
                  )}
                  <h3 className="font-semibold text-sm text-[#1A332B] mb-2">{addr.street}, {addr.number}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {addr.complement && <>{addr.complement} <br/></>}
                    {addr.neighborhood} <br/>
                    {addr.city} - {addr.state} <br/>
                    CEP: {addr.zip_code}
                  </p>
                  
                  <div className="mt-auto flex gap-4 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => startEditAddress(addr)}
                      className="text-xs uppercase text-gray-500 hover:text-[#1A332B] font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs uppercase text-red-400 hover:text-red-600 font-medium transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                  
                  {!addr.is_default && (
                    <button 
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="mt-4 w-full text-[10px] font-semibold text-[#1A332B] border border-[#1A332B] py-2 uppercase tracking-wider hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Tornar Principal
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
