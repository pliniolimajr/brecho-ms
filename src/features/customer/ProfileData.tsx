import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { isValidCPF } from '../../utils/validators';
import { useToast } from '../../components/Toast';

interface ProfileDataProps {
  user: User | null;
  customerData: any;
  fetchProfile: () => void;
}

export function ProfileData({ user, customerData, fetchProfile }: ProfileDataProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    first_name: customerData?.first_name || '',
    last_name: customerData?.last_name || '',
    cpf: customerData?.cpf || '',
    birth_date: customerData?.birth_date || '',
    phone: customerData?.phone || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.cpf && !isValidCPF(formData.cpf)) {
      showToast('CPF inválido. Por favor, verifique os dígitos informados.', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          cpf: formData.cpf,
          birth_date: formData.birth_date,
          phone: formData.phone,
        })
        .eq('user_id', user.id);
        
      if (error) throw error;
      await fetchProfile();
      showToast('Dados atualizados com sucesso!', 'success');
    } catch (err: any) {
      if (err.code === '23505') {
        showToast('Este CPF já está cadastrado em outra conta. Verifique os dados digitados.', 'error');
      } else {
        showToast('Erro ao atualizar: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded border border-[#C06A35]/20 animate-fade-in-up">
      <h2 className="text-xl font-serif text-[#1A332B] mb-8 italic border-b border-[#C06A35]/20 pb-4">Meus dados</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#1A332B]">Nome</label>
            <input 
              type="text" 
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A332B]">Sobrenome</label>
            <input 
              type="text" 
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A332B]">CPF</label>
            <input 
              type="text" 
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A332B]">Data de Nascimento</label>
            <input 
              type="date" 
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1A332B]">Celular</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#FDF6F0] border-b-2 border-transparent focus:border-[#C06A35] outline-none text-sm transition-colors text-[#1A332B]"
            />
          </div>
          
           <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#1A332B]">Email</label>
            <input 
              type="email" 
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border-b-2 border-transparent outline-none text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-6 flex flex-wrap gap-4 items-center justify-end border-t border-gray-100">
           <button
            type="button"
            className="px-6 py-2.5 text-sm font-semibold text-[#1A332B] border border-[#1A332B] uppercase tracking-wider hover:bg-gray-50 transition-colors"
          >
            Alterar Senha
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-[#423226] text-[#FDF6F0] text-sm font-semibold uppercase tracking-wider hover:bg-[#1A332B] transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
