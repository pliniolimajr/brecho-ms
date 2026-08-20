import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/Toast';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminOperationalPreferences } from './AdminOperationalPreferences';

const roleLabels: Record<string, string> = {
  owner: 'Proprietário', operations: 'Operação', support: 'Atendimento', finance: 'Financeiro',
};

export function AdminTeam() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operations');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const teamResult = await supabase.rpc('admin_list_team');
    if (teamResult.error) showToast(teamResult.error.message || 'Não foi possível carregar a equipe.', 'error');
    else setMembers(teamResult.data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void loadData(); }, [loadData]);

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId('new');
    const { error } = await supabase.rpc('owner_add_admin', { p_email: email.trim(), p_role: role });
    if (error) showToast(error.message || 'Não foi possível adicionar o membro.', 'error');
    else { setEmail(''); showToast('Membro adicionado à equipe.', 'success'); await loadData(); }
    setBusyId(null);
  };

  const updateMember = async (member: any, nextRole: string, active: boolean) => {
    setBusyId(member.id);
    const { error } = await supabase.rpc('owner_update_admin', {
      p_admin_id: member.id, p_role: nextRole, p_is_active: active,
    });
    if (error) showToast(error.message || 'Não foi possível atualizar o acesso.', 'error');
    else { showToast('Acesso administrativo atualizado.', 'success'); await loadData(); }
    setBusyId(null);
  };

  return (
    <section className="space-y-6">
      <header className="border border-[#EAD8CC] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C06A35]">Governança</p>
        <h2 className="mt-2 font-serif text-3xl text-[#1A332B]">Equipe e acessos</h2>
        <p className="mt-1 text-sm text-[#6B625C]">Cada pessoa recebe somente os recursos necessários para sua função.</p>
      </header>

      <form onSubmit={addMember} className="grid gap-3 border border-[#EAD8CC] bg-white p-5 md:grid-cols-[1fr_220px_auto]">
        <input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="E-mail de uma conta já cadastrada na loja" className="border border-gray-300 px-3 py-2 text-sm" />
        <select value={role} onChange={event => setRole(event.target.value)} className="border border-gray-300 bg-white px-3 py-2 text-sm">
          {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button disabled={busyId === 'new'} className="bg-[#1A332B] px-5 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Adicionar</button>
      </form>

      <div className="overflow-x-auto border border-[#EAD8CC] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#EAD8CC] bg-[#FDF6F0]"><tr><th className="p-4">E-mail</th><th className="p-4">Função</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="p-8 text-center">Carregando equipe...</td></tr> : members.map(member => (
              <tr key={member.id} className="border-b border-[#EAD8CC]/70">
                <td className="p-4 font-medium text-[#1A332B]">{member.email}</td>
                <td className="p-4"><select disabled={busyId === member.id} value={member.role} onChange={event => void updateMember(member, event.target.value, member.is_active)} className="border border-gray-300 bg-white px-3 py-2"><option value="owner">Proprietário</option><option value="operations">Operação</option><option value="support">Atendimento</option><option value="finance">Financeiro</option></select></td>
                <td className="p-4"><span className={member.is_active ? 'text-emerald-700' : 'text-gray-400'}>{member.is_active ? 'Ativo' : 'Desativado'}</span></td>
                <td className="p-4"><button disabled={busyId === member.id} onClick={() => void updateMember(member, member.role, !member.is_active)} className="text-xs font-bold uppercase underline disabled:opacity-40">{member.is_active ? 'Desativar' : 'Reativar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminAuditLog />
      <AdminOperationalPreferences />
    </section>
  );
}
