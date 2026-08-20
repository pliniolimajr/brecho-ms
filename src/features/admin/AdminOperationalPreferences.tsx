import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/Toast';

export function AdminOperationalPreferences() {
  const { showToast } = useToast();
  const [values, setValues] = useState({ processing: 24, lowStock: 0, snooze: 24 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_get_operational_preferences');
    if (error) showToast(error.message || 'Não foi possível carregar as preferências.', 'error');
    else if (data) {
      const result = data as unknown as Record<string, number>;
      setValues({ processing: result.processing_warning_hours, lowStock: result.low_stock_threshold, snooze: result.default_snooze_hours });
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc('owner_update_operational_preferences', {
      p_processing_warning_hours: values.processing,
      p_low_stock_threshold: values.lowStock,
      p_default_snooze_hours: values.snooze,
    });
    if (error) showToast(error.message || 'Não foi possível salvar as preferências.', 'error');
    else showToast('Preferências operacionais atualizadas.', 'success');
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="border border-[#EAD8CC] bg-white p-5">
      <h3 className="font-serif text-xl text-[#1A332B]">Critérios da operação</h3>
      <p className="mt-1 text-xs text-[#6B625C]">Defina quando a Central de Ação deve chamar a atenção da equipe.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="text-xs font-semibold text-[#423226]">Pedido pago atrasado após (horas)<input disabled={loading} required type="number" min="1" max="168" value={values.processing} onChange={event => setValues(current => ({ ...current, processing: Number(event.target.value) }))} className="mt-2 w-full border border-gray-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-[#423226]">Alertar quando estoque for igual ou menor que<input disabled={loading} required type="number" min="0" max="100" value={values.lowStock} onChange={event => setValues(current => ({ ...current, lowStock: Number(event.target.value) }))} className="mt-2 w-full border border-gray-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-[#423226]">Duração do “lembrar depois” (horas)<input disabled={loading} required type="number" min="1" max="168" value={values.snooze} onChange={event => setValues(current => ({ ...current, snooze: Number(event.target.value) }))} className="mt-2 w-full border border-gray-300 px-3 py-2 text-sm" /></label>
      </div>
      <button disabled={loading || saving} className="mt-5 bg-[#1A332B] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40">{saving ? 'Salvando...' : 'Salvar critérios'}</button>
    </form>
  );
}
