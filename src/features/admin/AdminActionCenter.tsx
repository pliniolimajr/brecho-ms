import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface AdminAlert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  section: 'orders' | 'inventory' | 'health';
  resource_id: string;
  occurred_at: string;
  alert_key: string;
  snoozed_until?: string;
}

interface AdminActionCenterProps {
  onNavigate: (section: 'orders' | 'inventory' | 'health', resourceId?: string) => void;
}

const severityLabels = { high: 'Urgente', medium: 'Atenção', low: 'Revisar' };

export function AdminActionCenter({ onNavigate }: AdminActionCenterProps) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [snoozedAlerts, setSnoozedAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | AdminAlert['severity']>('all');
  const [view, setView] = useState<'active' | 'snoozed'>('active');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [snoozeHours, setSnoozeHours] = useState(24);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    const [activeResult, snoozedResult, preferencesResult] = await Promise.all([
      supabase.rpc('admin_action_center'),
      supabase.rpc('admin_list_snoozed_alerts'),
      supabase.rpc('admin_get_operational_preferences'),
    ]);
    if (activeResult.error || snoozedResult.error) setError('Não foi possível carregar a central de ação.');
    else {
      setAlerts(Array.isArray(activeResult.data) ? activeResult.data as unknown as AdminAlert[] : []);
      setSnoozedAlerts(Array.isArray(snoozedResult.data) ? snoozedResult.data as unknown as AdminAlert[] : []);
      if (!preferencesResult.error && preferencesResult.data) {
        const preferences = preferencesResult.data as unknown as Record<string, number>;
        setSnoozeHours(Number(preferences.default_snooze_hours || 24));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAlerts(); }, [loadAlerts]);

  const sourceAlerts = view === 'active' ? alerts : snoozedAlerts;
  const counts = useMemo(() => ({
    high: sourceAlerts.filter(item => item.severity === 'high').length,
    medium: sourceAlerts.filter(item => item.severity === 'medium').length,
    low: sourceAlerts.filter(item => item.severity === 'low').length,
  }), [sourceAlerts]);
  const visibleAlerts = filter === 'all' ? sourceAlerts : sourceAlerts.filter(item => item.severity === filter);

  const handleSnooze = async (alertKey: string) => {
    setBusyKey(alertKey);
    const { error: mutationError } = await supabase.rpc('admin_snooze_alert', { p_alert_key: alertKey, p_hours: snoozeHours });
    if (mutationError) setError(mutationError.message || 'Não foi possível adiar a pendência.');
    else await loadAlerts();
    setBusyKey(null);
  };

  const handleRestore = async (alertKey: string) => {
    setBusyKey(alertKey);
    const { error: mutationError } = await supabase.rpc('admin_restore_alert', { p_alert_key: alertKey });
    if (mutationError) setError(mutationError.message || 'Não foi possível restaurar a pendência.');
    else await loadAlerts();
    setBusyKey(null);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border border-[#EAD8CC] bg-white p-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C06A35]">Prioridades operacionais</p>
          <h2 className="mt-2 font-serif text-3xl text-[#1A332B]">Central de ação</h2>
          <p className="mt-1 text-sm text-[#6B625C]">Pendências concretas, ordenadas pelo impacto na loja.</p>
        </div>
        <button type="button" onClick={() => void loadAlerts()} disabled={loading} className="border border-[#1A332B] px-5 py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40">
          {loading ? 'Atualizando...' : 'Atualizar central'}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['high', 'medium', 'low'] as const).map(severity => (
          <button key={severity} type="button" onClick={() => setFilter(filter === severity ? 'all' : severity)} className={`border p-4 text-left transition-colors ${filter === severity ? 'border-[#1A332B] bg-[#1A332B] text-white' : 'border-[#EAD8CC] bg-white text-[#1A332B]'}`}>
            <span className="text-xs font-bold uppercase tracking-wider">{severityLabels[severity]}</span>
            <span className="mt-2 block font-serif text-3xl">{counts[severity]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-5 border-b border-[#EAD8CC] text-xs font-bold uppercase tracking-wider">
        <button type="button" onClick={() => setView('active')} className={`pb-3 ${view === 'active' ? 'border-b-2 border-[#1A332B] text-[#1A332B]' : 'text-gray-400'}`}>Ativas ({alerts.length})</button>
        <button type="button" onClick={() => setView('snoozed')} className={`pb-3 ${view === 'snoozed' ? 'border-b-2 border-[#1A332B] text-[#1A332B]' : 'text-gray-400'}`}>Adiadas ({snoozedAlerts.length})</button>
      </div>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-900">{error} <button type="button" onClick={() => void loadAlerts()} className="font-bold underline">Tentar novamente</button></div>
      ) : !loading && visibleAlerts.length === 0 ? (
        <div className="border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900">Nenhuma pendência nesta categoria.</div>
      ) : (
        <div className="divide-y divide-[#EAD8CC] border border-[#EAD8CC] bg-white">
          {visibleAlerts.map((item, index) => (
            <article key={`${item.type}-${item.resource_id}-${index}`} className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
              <div className="flex gap-4">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.severity === 'high' ? 'bg-red-700' : item.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="font-semibold text-[#1A332B]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#6B625C]">{item.detail}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-400">{new Date(item.occurred_at).toLocaleString('pt-BR')}</p>
                  {view === 'snoozed' && item.snoozed_until && <p className="mt-1 text-[10px] font-semibold text-amber-700">Adiada até {new Date(item.snoozed_until).toLocaleString('pt-BR')}</p>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {view === 'active' ? (
                  <button type="button" disabled={busyKey === item.alert_key} onClick={() => void handleSnooze(item.alert_key)} className="text-xs font-semibold text-[#6B625C] underline underline-offset-4 disabled:opacity-40">Lembrar em {snoozeHours}h</button>
                ) : (
                  <button type="button" disabled={busyKey === item.alert_key} onClick={() => void handleRestore(item.alert_key)} className="text-xs font-semibold text-[#6B625C] underline underline-offset-4 disabled:opacity-40">Reativar agora</button>
                )}
                <button type="button" onClick={() => onNavigate(item.section, item.section === 'orders' ? item.resource_id : undefined)} className="text-left text-xs font-bold uppercase tracking-wider text-[#1A332B] underline underline-offset-4">
                  Abrir pendência →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
