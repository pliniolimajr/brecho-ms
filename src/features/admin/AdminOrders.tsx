import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/Toast';
import { TableSkeleton } from '../../components/LoadingStates';

interface AdminOrdersProps {
  adminOrders: any[];
  totalOrders: number;
  loading: boolean;
  storeInfo: any;
  fetchAdminOrders: (query?: AdminOrderQuery) => Promise<void>;
  fetchCRMData: () => Promise<void>;
  handleExportCSV: () => void;
}

export interface AdminOrderQuery {
  page: number;
  pageSize: number;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  minValue: number | null;
  maxValue: number | null;
  paymentMethod: string | null;
  search: string | null;
}

export function AdminOrders({
  adminOrders,
  totalOrders,
  loading,
  storeInfo,
  fetchAdminOrders,
  fetchCRMData,
  handleExportCSV
}: AdminOrdersProps) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null);
  const [tempTrackingCode, setTempTrackingCode] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderEvents, setOrderEvents] = useState<Record<string, any[]>>({});
  const [loadingEventsId, setLoadingEventsId] = useState<string | null>(null);
  const [creatingLabelId, setCreatingLabelId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [internalNotes, setInternalNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [postSaleData, setPostSaleData] = useState<Record<string, any>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [returnItemIds, setReturnItemIds] = useState<Record<string, string[]>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [postSaleBusyId, setPostSaleBusyId] = useState<string | null>(null);

  // Filtros de Data
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const initialOrderSearch = new URLSearchParams(window.location.search).get('order') || '';
  const [searchQuery, setSearchQuery] = useState<string>(initialOrderSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialOrderSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const selectedOrders = adminOrders.filter(order => selectedOrderIds.includes(order.id));
  const bulkTarget = selectedOrders.length > 0 && selectedOrders.every(order => order.status === selectedOrders[0].status)
    ? ({ pending: 'cancelled', paid: 'shipped', shipped: 'delivered' } as Record<string, string>)[selectedOrders[0].status]
    : undefined;
  const bulkActionLabels: Record<string, string> = {
    cancelled: 'Cancelar selecionados', shipped: 'Marcar selecionados como enviados', delivered: 'Marcar selecionados como entregues',
  };

  const allowedStatusOptions: Record<string, Array<{ value: string; label: string }>> = {
    pending: [
      { value: 'pending', label: 'Pendente' },
      { value: 'cancelled', label: 'Cancelar pedido' },
    ],
    paid: [
      { value: 'paid', label: 'Pago / em separação' },
      { value: 'shipped', label: 'Marcar como enviado' },
    ],
    shipped: [
      { value: 'shipped', label: 'Enviado' },
      { value: 'delivered', label: 'Marcar como entregue' },
    ],
    delivered: [{ value: 'delivered', label: 'Entregue' }],
    cancelled: [{ value: 'cancelled', label: 'Cancelado' }],
  };

  const logStatusHistory = async (orderId: string, action: string, details?: string) => {
    try {
      const { error } = await supabase.rpc('admin_add_order_event', {
        p_order_id: orderId,
        p_event_type: 'admin_action',
        p_title: action,
        p_details: details ? { description: details } : {},
      });
      if (error) throw error;
    } catch (e) {
      console.warn('Falha ao registrar histórico de status:', e);
    }
  };

  const toggleOrderDetails = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    setLoadingEventsId(orderId);
    const [eventsResult, postSaleResult] = await Promise.all([
      supabase.rpc('admin_get_order_events', { p_order_id: orderId }),
      supabase.rpc('admin_get_order_post_sale', { p_order_id: orderId }),
    ]);
    if (eventsResult.error || postSaleResult.error) showToast('Não foi possível carregar todos os dados do pedido.', 'error');
    if (!eventsResult.error) setOrderEvents(previous => ({ ...previous, [orderId]: eventsResult.data || [] }));
    if (!postSaleResult.error) setPostSaleData(previous => ({ ...previous, [orderId]: postSaleResult.data || {} }));
    setLoadingEventsId(null);
  };

  const refreshOrderDetails = async (orderId: string) => {
    const [eventsResult, postSaleResult] = await Promise.all([
      supabase.rpc('admin_get_order_events', { p_order_id: orderId }),
      supabase.rpc('admin_get_order_post_sale', { p_order_id: orderId }),
    ]);
    if (!eventsResult.error) setOrderEvents(previous => ({ ...previous, [orderId]: eventsResult.data || [] }));
    if (!postSaleResult.error) setPostSaleData(previous => ({ ...previous, [orderId]: postSaleResult.data || {} }));
  };

  const handleCreateReturn = async (order: any) => {
    const selectedItems = returnItemIds[order.id] || [];
    const reason = returnReasons[order.id]?.trim();
    if (!reason || selectedItems.length === 0) {
      showToast('Selecione ao menos um item e informe o motivo.', 'warning');
      return;
    }
    setPostSaleBusyId(order.id);
    const { error } = await supabase.rpc('admin_create_order_return', {
      p_order_id: order.id, p_reason: reason, p_order_item_ids: selectedItems, p_internal_note: null,
    });
    if (error) showToast(error.message || 'Não foi possível registrar a devolução.', 'error');
    else {
      setReturnReasons(previous => ({ ...previous, [order.id]: '' }));
      setReturnItemIds(previous => ({ ...previous, [order.id]: [] }));
      await Promise.all([refreshOrderDetails(order.id), fetchAdminOrders()]);
      showToast('Devolução registrada.', 'success');
    }
    setPostSaleBusyId(null);
  };

  const handleReturnTransition = async (orderId: string, returnId: string, status: string, restock = false) => {
    const action = restock ? 'confirmar o recebimento e repor os itens no estoque' : `alterar a devolução para ${status}`;
    if (!confirm(`Deseja realmente ${action}?`)) return;
    setPostSaleBusyId(orderId);
    const { error } = await supabase.rpc('admin_transition_order_return', {
      p_return_id: returnId, p_new_status: status, p_restock: restock, p_internal_note: null,
    });
    if (error) showToast(error.message || 'Não foi possível atualizar a devolução.', 'error');
    else {
      await Promise.all([refreshOrderDetails(orderId), fetchAdminOrders(), fetchCRMData()]);
      showToast(restock ? 'Recebimento confirmado e estoque reposto.' : 'Devolução atualizada.', 'success');
    }
    setPostSaleBusyId(null);
  };

  const handleRefund = async (order: any) => {
    const amount = Number(String(refundAmounts[order.id] || '').replace(',', '.'));
    const refundable = Number(postSaleData[order.id]?.refundable_amount || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > refundable) {
      showToast(`Informe um valor entre R$ 0,01 e R$ ${refundable.toFixed(2).replace('.', ',')}.`, 'warning');
      return;
    }
    const isFull = Math.abs(amount - refundable) < 0.001;
    if (!confirm(`${isFull ? 'Reembolsar integralmente' : 'Reembolsar parcialmente'} R$ ${amount.toFixed(2).replace('.', ',')} pelo Mercado Pago? Esta ação movimenta dinheiro e não pode ser desfeita.`)) return;

    setPostSaleBusyId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão administrativa expirada.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refund-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ orderId: order.id, amount, idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || 'Não foi possível realizar o reembolso.');
      setRefundAmounts(previous => ({ ...previous, [order.id]: '' }));
      await Promise.all([refreshOrderDetails(order.id), fetchAdminOrders(), fetchCRMData()]);
      showToast(isFull ? 'Reembolso total aprovado.' : 'Reembolso parcial aprovado.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao processar reembolso.', 'error');
    } finally {
      setPostSaleBusyId(null);
    }
  };

  const renderPostSale = (order: any) => {
    const data = postSaleData[order.id] || {};
    const returns = Array.isArray(data.returns) ? data.returns : [];
    const refunds = Array.isArray(data.refunds) ? data.refunds : [];
    const refundable = Number(data.refundable_amount || 0);
    const selectedItems = returnItemIds[order.id] || [];
    const busy = postSaleBusyId === order.id;
    const canRefund = ['paid', 'partially_refunded'].includes(order.payment_status) && refundable > 0;
    const returnStatusLabels: Record<string, string> = {
      requested: 'Solicitada', approved: 'Aprovada', received: 'Recebida', completed: 'Concluída',
      rejected: 'Recusada', cancelled: 'Cancelada',
    };

    return (
      <section className="mt-6 border-t border-[#C06A35]/25 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A332B]">Pós-venda</h4>
            <p className="mt-1 text-[11px] text-gray-500">Devolução física e reembolso financeiro são controlados separadamente.</p>
          </div>
          <span className="text-xs font-semibold text-[#1A332B]">Disponível para reembolso: R$ {refundable.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="border border-gray-200 bg-white p-4">
            <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#1A332B]">Registrar devolução</h5>
            <div className="space-y-2">
              {(order.order_items || []).map((item: any) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-[#423226]">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={event => setReturnItemIds(previous => ({
                      ...previous,
                      [order.id]: event.target.checked
                        ? [...(previous[order.id] || []), item.id]
                        : (previous[order.id] || []).filter(id => id !== item.id),
                    }))}
                  />
                  {item.products?.name || 'Item'} · R$ {Number(item.price).toFixed(2).replace('.', ',')}
                </label>
              ))}
              <textarea
                value={returnReasons[order.id] || ''}
                onChange={event => setReturnReasons(previous => ({ ...previous, [order.id]: event.target.value }))}
                maxLength={500}
                rows={2}
                placeholder="Motivo da devolução"
                className="mt-2 w-full resize-none border border-gray-300 px-3 py-2 text-xs"
              />
              <button type="button" disabled={busy} onClick={() => void handleCreateReturn(order)} className="bg-[#1A332B] px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40">
                Registrar devolução
              </button>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-4">
            <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#1A332B]">Reembolso Mercado Pago</h5>
            {canRefund ? (
              <>
                <div className="flex gap-2">
                  <input type="text" inputMode="decimal" value={refundAmounts[order.id] || ''} onChange={event => setRefundAmounts(previous => ({ ...previous, [order.id]: event.target.value }))} placeholder={`Até R$ ${refundable.toFixed(2).replace('.', ',')}`} className="min-w-0 flex-1 border border-gray-300 px-3 py-2 text-xs" />
                  <button type="button" onClick={() => setRefundAmounts(previous => ({ ...previous, [order.id]: refundable.toFixed(2) }))} className="border border-[#1A332B] px-3 py-2 text-[10px] font-bold uppercase text-[#1A332B]">Valor total</button>
                </div>
                <button type="button" disabled={busy} onClick={() => void handleRefund(order)} className="mt-2 bg-[#8B1E1E] px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40">
                  {busy ? 'Processando...' : 'Confirmar reembolso'}
                </button>
                <p className="mt-2 text-[10px] text-amber-800">A reposição de estoque não acontece automaticamente.</p>
              </>
            ) : <p className="text-xs text-gray-500">Este pedido não possui saldo financeiro reembolsável.</p>}
          </div>
        </div>

        {returns.length > 0 && (
          <div className="mt-4 space-y-2">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#1A332B]">Devoluções registradas</h5>
            {returns.map((item: any) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white p-3 text-xs">
                <div>
                  <strong>{returnStatusLabels[item.status] || item.status}</strong> · {item.reason}
                  <p className="mt-1 text-[10px] text-gray-500">{(item.items || []).map((returned: any) => returned.product_name || 'Item').join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status === 'requested' && <button disabled={busy} onClick={() => void handleReturnTransition(order.id, item.id, 'approved')} className="border border-[#1A332B] px-3 py-1 font-semibold">Aprovar</button>}
                  {item.status === 'requested' && <button disabled={busy} onClick={() => void handleReturnTransition(order.id, item.id, 'rejected')} className="border border-red-700 px-3 py-1 font-semibold text-red-700">Recusar</button>}
                  {item.status === 'approved' && <button disabled={busy} onClick={() => void handleReturnTransition(order.id, item.id, 'received', true)} className="bg-[#1A332B] px-3 py-1 font-semibold text-white">Confirmar recebimento + estoque</button>}
                  {item.status === 'received' && <button disabled={busy} onClick={() => void handleReturnTransition(order.id, item.id, 'completed')} className="bg-[#1A332B] px-3 py-1 font-semibold text-white">Concluir</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {refunds.length > 0 && (
          <div className="mt-4 text-[11px] text-gray-600">
            <strong>Reembolsos:</strong> {refunds.map((refund: any) => `R$ ${Number(refund.amount).toFixed(2).replace('.', ',')} (${refund.status})`).join(' · ')}
          </div>
        )}
      </section>
    );
  };

  const handleBulkTransition = async () => {
    if (!bulkTarget || !selectedOrderIds.length) return;
    if (bulkTarget === 'cancelled' && !confirm(`Cancelar ${selectedOrderIds.length} pedido(s) pendente(s)?`)) return;
    setBulkUpdating(true);
    const { error } = await supabase.rpc('admin_bulk_transition_order_status', {
      p_order_ids: selectedOrderIds,
      p_new_status: bulkTarget,
    });
    if (error) showToast(error.message || 'Não foi possível atualizar os pedidos.', 'error');
    else {
      showToast(`${selectedOrderIds.length} pedido(s) atualizado(s).`, 'success');
      setSelectedOrderIds([]);
      await Promise.all([fetchAdminOrders(), fetchCRMData()]);
    }
    setBulkUpdating(false);
  };

  const handleAddInternalNote = async (orderId: string) => {
    const note = internalNotes[orderId]?.trim();
    if (!note) return;
    setSavingNoteId(orderId);
    const { error } = await supabase.rpc('admin_add_order_event', {
      p_order_id: orderId, p_event_type: 'internal_note', p_title: 'Nota interna',
      p_details: { description: note },
    });
    if (error) showToast(error.message || 'Não foi possível salvar a nota.', 'error');
    else {
      setInternalNotes(previous => ({ ...previous, [orderId]: '' }));
      const { data } = await supabase.rpc('admin_get_order_events', { p_order_id: orderId });
      setOrderEvents(previous => ({ ...previous, [orderId]: data || [] }));
      showToast('Nota adicionada à linha do tempo.', 'success');
    }
    setSavingNoteId(null);
  };

  const paymentStatusLabels: Record<string, string> = {
    pending: 'Pagamento pendente', in_process: 'Em análise', paid: 'Pagamento aprovado',
    rejected: 'Pagamento recusado', cancelled: 'Pagamento cancelado', refunded: 'Reembolsado',
    partially_refunded: 'Reembolso parcial', charged_back: 'Contestado',
  };
  const fulfillmentStatusLabels: Record<string, string> = {
    unfulfilled: 'Não separado', processing: 'Em separação', ready_to_ship: 'Pronto para envio',
    shipped: 'Enviado', delivered: 'Entregue', not_required: 'Envio dispensado',
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const statusNames: Record<string, string> = {
      pending: 'Aguardando Pagamento',
      paid: 'Pago / Preparando Envio',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    const friendlyStatus = statusNames[newStatus] || newStatus;

    setUpdatingStatusId(orderId);
    try {
      const { error } = await supabase.rpc('admin_transition_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      showToast(`Pedido atualizado para ${friendlyStatus}.`, 'success');
      await Promise.all([fetchAdminOrders(), fetchCRMData()]);
      setOrderEvents(previous => {
        const next = { ...previous };
        delete next[orderId];
        return next;
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao atualizar status do pedido.', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveTrackingCode = async (orderId: string, code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      showToast('Informe um código de rastreio.', 'warning');
      return;
    }
    setSavingTrackingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: normalizedCode })
        .eq('id', orderId);
      if (error) throw error;

      await logStatusHistory(orderId, `Código de rastreio atualizado`, `Código: ${normalizedCode}`);
      await fetchAdminOrders();
      setEditingTrackingId(null);
      showToast('Código de rastreio atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Erro ao salvar código de rastreio.', 'error');
    } finally {
      setSavingTrackingId(null);
    }
  };

  const handleCreateShippingLabel = async (orderId: string) => {
    setCreatingLabelId(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão administrativa expirada.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-shipping-label`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Não foi possível emitir a etiqueta.');
      }

      await logStatusHistory(
        orderId,
        'Etiqueta de envio emitida via SuperFrete Sandbox',
        `Rastreio: ${result.trackingCode || 'aguardando liberação'}`,
      );
      fetchAdminOrders();
      showToast('Etiqueta de teste emitida com sucesso!', 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Erro ao emitir etiqueta.', 'error');
      fetchAdminOrders();
    } finally {
      setCreatingLabelId(null);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate, minValue, maxValue, paymentMethod, debouncedSearch]);

  useEffect(() => {
    const visibleIds = new Set(adminOrders.map(order => order.id));
    setSelectedOrderIds(previous => previous.filter(id => visibleIds.has(id)));
  }, [adminOrders]);

  useEffect(() => {
    void fetchAdminOrders({
      page: currentPage,
      pageSize,
      status: statusFilter === 'all' ? null : statusFilter,
      startDate: startDate || null,
      endDate: endDate || null,
      minValue: minValue === '' ? null : Number(minValue),
      maxValue: maxValue === '' ? null : Number(maxValue),
      paymentMethod: paymentMethod === 'all' ? null : paymentMethod,
      search: debouncedSearch || null,
    });
  }, [currentPage, debouncedSearch, endDate, fetchAdminOrders, maxValue, minValue, paymentMethod, startDate, statusFilter]);

  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">Gestão de Pedidos</h2>
          <p className="text-xs text-gray-500">Acompanhe entregas, status de pagamento e etiquetas de envio</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="border border-[#1A332B] text-[#1A332B] px-5 py-2.5 rounded-none text-xs font-semibold uppercase tracking-widest hover:bg-[#1A332B] hover:text-white transition-colors"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded shadow-sm border border-[#C06A35]/20 flex flex-col gap-4">
        
        {/* Linha 1: Status e Datas */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#423226] mr-2">Status:</span>
            {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors uppercase ${statusFilter === st
                    ? 'bg-[#1A332B] text-white'
                    : 'bg-[#FDF6F0] text-[#423226] hover:bg-[#C06A35]/20'
                  }`}
              >
                {st === 'all' && 'Todos'}
                {st === 'pending' && 'Pendente'}
                {st === 'paid' && 'Pago'}
                {st === 'shipped' && 'Enviado'}
                {st === 'delivered' && 'Entregue'}
                {st === 'cancelled' && 'Cancelado'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-[#FDF6F0] p-1.5 rounded border border-[#C06A35]/30">
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-bold text-[#A8A29E] ml-1">De:</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white text-xs border border-gray-200 rounded px-2 py-1 text-[#1A332B] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-bold text-[#A8A29E]">Até:</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white text-xs border border-gray-200 rounded px-2 py-1 text-[#1A332B] outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] text-[#C06A35] underline px-2 font-bold hover:text-[#1A332B]"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-[10px] uppercase font-bold text-[#A8A29E]">
            Valor mínimo
            <input
              type="number"
              min="0"
              step="0.01"
              value={minValue}
              onChange={(event) => setMinValue(event.target.value)}
              placeholder="R$ 0,00"
              className="mt-1 w-full bg-[#FDF6F0] border border-[#C06A35]/30 rounded px-3 py-2 text-sm text-[#1A332B] font-normal normal-case outline-none"
            />
          </label>
          <label className="text-[10px] uppercase font-bold text-[#A8A29E]">
            Valor máximo
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxValue}
              onChange={(event) => setMaxValue(event.target.value)}
              placeholder="Sem limite"
              className="mt-1 w-full bg-[#FDF6F0] border border-[#C06A35]/30 rounded px-3 py-2 text-sm text-[#1A332B] font-normal normal-case outline-none"
            />
          </label>
          <label className="text-[10px] uppercase font-bold text-[#A8A29E]">
            Forma de pagamento
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="mt-1 w-full bg-[#FDF6F0] border border-[#C06A35]/30 rounded px-3 py-2 text-sm text-[#1A332B] font-normal normal-case outline-none"
            >
              <option value="all">Todas</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="pix">Pix</option>
              <option value="ticket">Boleto</option>
            </select>
          </label>
        </div>

        {/* Linha 2: Busca por texto */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar por ID, cliente, e-mail, telefone, produto ou rastreio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FDF6F0] border border-[#C06A35]/30 rounded px-3 py-2 text-sm text-[#1A332B] placeholder-gray-400 focus:outline-none focus:border-[#1A332B]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-sm text-gray-400 hover:text-[#1A332B] font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {selectedOrderIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#C06A35]/30 bg-[#FFF8F1] p-4">
          <p className="text-sm font-semibold text-[#1A332B]">{selectedOrderIds.length} pedido(s) selecionado(s)</p>
          <div className="flex items-center gap-3">
            {!bulkTarget && <span className="text-xs text-amber-800">Selecione pedidos que estejam no mesmo status.</span>}
            <button type="button" onClick={() => setSelectedOrderIds([])} className="text-xs font-bold uppercase underline">Limpar</button>
            <button type="button" disabled={!bulkTarget || bulkUpdating} onClick={() => void handleBulkTransition()} className="bg-[#1A332B] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">
              {bulkUpdating ? 'Atualizando...' : bulkTarget ? bulkActionLabels[bulkTarget] : 'Ação indisponível'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} columns={8} label="Carregando pedidos" />
        ) : adminOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum pedido encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDF6F0] border-b border-[#C06A35]/20 text-[#1A332B] font-medium text-sm">
                  <th className="p-4">
                    <input type="checkbox" aria-label="Selecionar pedidos desta página" checked={adminOrders.length > 0 && adminOrders.every(order => selectedOrderIds.includes(order.id))} onChange={event => setSelectedOrderIds(event.target.checked ? adminOrders.map(order => order.id) : [])} />
                  </th>
                  <th className="p-4">Pedido / Data</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Itens</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rastreio / Etiqueta</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.map(order => {
                  const clientName = `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim() || 'Cliente';
                  const dateStr = new Date(order.created_at).toLocaleDateString('pt-BR');
                  const legacyHistory = Array.isArray(order.status_history)
                    ? order.status_history
                    : (order.shipping_address && Array.isArray(order.shipping_address.statusHistory))
                    ? order.shipping_address.statusHistory
                    : [];
                  const history = orderEvents[order.id] || legacyHistory;

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]/50 transition-colors">
                        <td className="p-4"><input type="checkbox" aria-label={`Selecionar pedido ${order.id}`} checked={selectedOrderIds.includes(order.id)} onChange={event => setSelectedOrderIds(previous => event.target.checked ? [...previous, order.id] : previous.filter(id => id !== order.id))} /></td>
                        <td 
                          className="p-4 cursor-pointer hover:underline"
                          onClick={() => void toggleOrderDetails(order.id)}
                        >
                          <span className="font-mono text-xs font-bold text-[#1A332B] block flex items-center gap-1">
                            #{order.id.split('-')[0].toUpperCase()}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </span>
                          <span className="text-xs text-gray-500">{dateStr}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-semibold text-[#1A332B] block">{clientName}</span>
                          <span className="text-xs text-gray-500">{order.shipping_address?.phone || 'Sem tel.'}</span>
                        </td>
                        <td className="p-4 text-xs text-[#423226]">
                          {order.order_items?.map((item: any, idx: number) => (
                            <div key={idx} className="line-clamp-1">
                              • {item.products?.name} ({item.products?.size || 'U'})
                            </div>
                          ))}
                        </td>
                        <td className="p-4 text-sm font-bold text-[#1A332B]">
                          R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-4">
                          <div className="mb-2 space-y-1">
                            <span className={`block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : order.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                              {paymentStatusLabels[order.payment_status] || order.payment_status || 'Pagamento não informado'}
                            </span>
                            <span className="block w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                              {fulfillmentStatusLabels[order.fulfillment_status] || order.fulfillment_status || 'Envio não informado'}
                            </span>
                          </div>
                          <select
                            value={order.status}
                            disabled={updatingStatusId === order.id}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-semibold disabled:cursor-wait disabled:opacity-50"
                          >
                            {(allowedStatusOptions[order.status] || [{ value: order.status, label: order.status }]).map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-xs">
                          {editingTrackingId === order.id ? (
                            <div className="flex gap-1 items-center">
                              <input
                                type="text"
                                value={tempTrackingCode}
                                onChange={(e) => setTempTrackingCode(e.target.value)}
                                placeholder="Código Rastreio"
                                className="border p-1 text-xs rounded w-28"
                              />
                              <button
                                onClick={() => handleSaveTrackingCode(order.id, tempTrackingCode)}
                                disabled={savingTrackingId === order.id}
                                className="bg-green-700 text-white text-xs px-2 py-1 rounded disabled:cursor-wait disabled:opacity-50"
                              >
                                {savingTrackingId === order.id ? '...' : 'OK'}
                              </button>
                              <button
                                onClick={() => setEditingTrackingId(null)}
                                className="text-gray-500 text-xs"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {order.tracking_code ? (
                                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block w-fit">
                                  {order.tracking_code}
                                </span>
                              ) : (
                                <button
                                  onClick={() => { setEditingTrackingId(order.id); setTempTrackingCode(''); }}
                                  className="text-xs text-[#C06A35] underline"
                                >
                                  + Add Rastreio
                                </button>
                              )}

                              <div className="flex gap-2 pt-1">
                                {order.shipping_label_url && (
                                  <a
                                    href={order.shipping_label_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-700 underline"
                                  >
                                    Abrir etiqueta
                                  </a>
                                )}
                                <button
                                  onClick={() => handleCreateShippingLabel(order.id)}
                                  disabled={creatingLabelId === order.id || !['paid', 'shipped'].includes(order.status)}
                                  className="text-[10px] bg-[#1A332B] text-white px-2 py-0.5 rounded hover:bg-[#433E38] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {creatingLabelId === order.id
                                    ? 'Processando...'
                                    : order.shipping_provider_id && !order.shipping_label_url
                                      ? 'Tentar Pagamento'
                                      : 'Emitir Etiqueta Teste'}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs space-y-1">
                          <button
                            onClick={() => printDeclarationOfContent(order, storeInfo, showToast)}
                            className="text-blue-600 hover:underline block text-left"
                          >
                            Declaração de Conteúdo
                          </button>
                          <button
                            onClick={() => printShippingLabel(order, storeInfo, showToast)}
                            className="text-amber-700 hover:underline block text-left"
                          >
                            Etiqueta para Impressão
                          </button>
                        </td>
                      </tr>

                      {expandedOrderId === order.id && (
                        <tr className="bg-[#FDF6F0]/40 border-b border-[#C06A35]/15">
                          <td colSpan={8} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs uppercase tracking-wider font-bold text-[#1A332B] mb-2">Endereço de Entrega</h4>
                                <div className="text-xs text-[#423226] space-y-1 bg-white p-3 rounded border border-gray-200 shadow-sm">
                                  <p><strong>Destinatário:</strong> {clientName}</p>
                                  <p><strong>Rua:</strong> {order.shipping_address?.street}, {order.shipping_address?.number} {order.shipping_address?.complement && ` - ${order.shipping_address.complement}`}</p>
                                  <p><strong>Bairro:</strong> {order.shipping_address?.neighborhood}</p>
                                  <p><strong>Cidade/UF:</strong> {order.shipping_address?.city} - {order.shipping_address?.state}</p>
                                  <p><strong>CEP:</strong> {order.shipping_address?.postalCode}</p>
                                  {order.shipping_address?.shippingService && (
                                    <p><strong>Frete:</strong> {order.shipping_address.shippingService} (R$ {Number(order.shipping_address.shippingCost || 0).toFixed(2).replace('.', ',')})</p>
                                  )}
                                  <p><strong>Método de Pagamento:</strong> <span className="uppercase font-semibold">{order.payment_method}</span></p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs uppercase tracking-wider font-bold text-[#1A332B] mb-2">Rastreabilidade & Histórico</h4>
                                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm space-y-3 max-h-48 overflow-y-auto">
                                  {loadingEventsId === order.id ? (
                                    <p className="text-xs text-gray-400 italic">Carregando linha do tempo...</p>
                                  ) : history.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Nenhum evento registrado no histórico.</p>
                                  ) : (
                                    <div className="relative border-l border-gray-200 pl-4 ml-1.5 space-y-3 text-left">
                                      {history.map((h: any, idx: number) => (
                                        <div key={idx} className="relative">
                                          <div className="absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full bg-[#C06A35] border border-white" />
                                          <div className="text-xs">
                                            <span className="font-semibold text-[#1A332B] block">{h.title || h.action}</span>
                                            <span className="text-[10px] text-gray-500 block">
                                              {new Date(h.created_at || h.timestamp).toLocaleString('pt-BR')} • por {h.actor_email || h.changed_by || 'sistema'}
                                            </span>
                                            {(h.details?.description || (typeof h.details === 'string' && h.details)) && (
                                              <p className="text-[10px] text-gray-400 mt-0.5">{h.details?.description || h.details}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <input value={internalNotes[order.id] || ''} onChange={event => setInternalNotes(previous => ({ ...previous, [order.id]: event.target.value }))} maxLength={500} placeholder="Adicionar nota interna..." className="min-w-0 flex-1 border border-gray-300 bg-white px-3 py-2 text-xs" />
                                  <button type="button" disabled={savingNoteId === order.id || !internalNotes[order.id]?.trim()} onClick={() => void handleAddInternalNote(order.id)} className="bg-[#1A332B] px-3 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40">
                                    {savingNoteId === order.id ? 'Salvando...' : 'Adicionar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            {renderPostSale(order)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <nav className="flex flex-wrap justify-center items-center gap-3" aria-label="Paginação de pedidos">
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            className="px-4 py-2 border border-[#C06A35]/30 text-xs font-bold uppercase text-[#1A332B] disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[#423226]">
            Página {currentPage} de {totalPages} · {totalOrders} pedido(s)
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            className="px-4 py-2 border border-[#C06A35]/30 text-xs font-bold uppercase text-[#1A332B] disabled:opacity-40"
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}

function printDeclarationOfContent(order: any, storeInfo: any, showToast: any) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    showToast('Por favor, ative a exibição de popups para imprimir.', 'warning');
    return;
  }

  const items = order.order_items || [];
  const totalQuantity = items.length;
  const totalPrice = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);

  const address = order.shipping_address || {};
  const recipientName = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Cliente';
  const recipientDoc = address.cpf || 'N/A';
  const recipientAddress = `${address.street || ''}, ${address.number || ''} ${address.complement ? '- ' + address.complement : ''}`;
  const recipientCityState = `${address.city || ''} / ${address.state || ''}`;
  const recipientZip = address.postalCode || '';

  const senderName = storeInfo.name || 'Palm CO.';
  const senderDoc = storeInfo.document || '';
  const senderAddress = storeInfo.address || '';
  const senderCityState = `${storeInfo.city || ''} / ${storeInfo.state || ''}`;
  const senderZip = storeInfo.zipCode || '';

  const rows = items.map((item: any, idx: number) => `
    <tr>
      <td style="border: 1px solid black; padding: 6px; text-align: center; font-family: monospace;">${idx + 1}</td>
      <td style="border: 1px solid black; padding: 6px;">${item.products?.name || 'Item de Moda'}</td>
      <td style="border: 1px solid black; padding: 6px; text-align: center;">UN</td>
      <td style="border: 1px solid black; padding: 6px; text-align: center;">1</td>
      <td style="border: 1px solid black; padding: 6px; text-align: right;">R$ ${Number(item.price).toFixed(2).replace('.', ',')}</td>
    </tr>
  `).join('');

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Declaração de Conteúdo - Pedido #${order.id.split('-')[0].toUpperCase()}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; color: #000; margin: 20px; }
        .table-full { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .table-full th, .table-full td { border: 1px solid black; padding: 5px; vertical-align: top; }
        .section-title { font-weight: bold; background-color: #eee; text-align: center; font-size: 11px; padding: 4px; border: 1px solid black; }
        .header { text-align: center; font-weight: bold; font-size: 14px; padding: 8px; border: 1px solid black; margin-bottom: 8px; }
        .declaration-text { font-size: 8px; text-align: justify; margin-top: 8px; margin-bottom: 12px; line-height: 1.3; }
        .signature-section { display: flex; justify-content: space-between; margin-top: 20px; }
        .signature-box { border-top: 1px solid black; text-align: center; width: 45%; padding-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">DECLARAÇÃO DE CONTEÚDO</div>
      
      <table class="table-full">
        <tr>
          <td style="width: 50%;">
            <strong>REMETENTE:</strong> ${senderName}<br/>
            <strong>CPF/CNPJ:</strong> ${senderDoc}<br/>
            <strong>ENDEREÇO:</strong> ${senderAddress}<br/>
            <strong>CIDADE/UF:</strong> ${senderCityState}<br/>
            <strong>CEP:</strong> ${senderZip}
          </td>
          <td style="width: 50%;">
            <strong>DESTINATÁRIO:</strong> ${recipientName}<br/>
            <strong>CPF/CNPJ:</strong> ${recipientDoc}<br/>
            <strong>ENDEREÇO:</strong> ${recipientAddress}<br/>
            <strong>CIDADE/UF:</strong> ${recipientCityState}<br/>
            <strong>CEP:</strong> ${recipientZip}
          </td>
        </tr>
      </table>

      <table class="table-full">
        <thead>
          <tr style="background-color: #eee; font-weight: bold;">
            <th style="width: 5%; text-align: center;">ITEM</th>
            <th style="width: 55%; text-align: left;">CONTEÚDO</th>
            <th style="width: 10%; text-align: center;">UNID.</th>
            <th style="width: 10%; text-align: center;">QTD.</th>
            <th style="width: 20%; text-align: right;">VALOR (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold;">
            <td colspan="3" style="text-align: right; border: 1px solid black; padding: 6px;">TOTAIS</td>
            <td style="text-align: center; border: 1px solid black; padding: 6px;">${totalQuantity}</td>
            <td style="text-align: right; border: 1px solid black; padding: 6px;">R$ ${totalPrice.toFixed(2).replace('.', ',')}</td>
          </tr>
        </tbody>
      </table>

      <div class="declaration-text">
        <strong>DECLARAÇÃO:</strong> Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, 
        tendo em vista que as mercadorias descritas nesta declaração representam bens de propriedade privada e não se destinam à venda comercial. 
        Declaro, ainda, sob as penas da lei, que o conteúdo deste envio não é proibido pelas normas postais ou pela legislação em vigor.
      </div>

      <div class="signature-section">
        <div style="width: 45%;">
          <strong>DATA:</strong> ${senderCityState.split('/')[0]?.trim() || 'Campo Grande'} / ${senderCityState.split('/')[1]?.trim() || 'MS'}, ${currentDate}
        </div>
        <div class="signature-box">
          Assinatura do Declarante / Remetente
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

function printShippingLabel(order: any, storeInfo: any, showToast: any) {
  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) {
    showToast('Por favor, ative a exibição de popups para imprimir.', 'warning');
    return;
  }

  const address = order.shipping_address || {};
  const recipientName = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Cliente';
  const recipientPhone = address.phone || '';
  const recipientAddress = `${address.street || ''}, ${address.number || ''} ${address.complement ? '- ' + address.complement : ''}`;
  const recipientNeighborhood = address.neighborhood || '';
  const recipientCityState = `${address.city || ''} / ${address.state || ''}`;
  const recipientZip = address.postalCode || '';

  const senderName = storeInfo.name || 'Palm CO.';
  const senderAddress = storeInfo.address || '';
  const senderCityState = `${storeInfo.city || ''} / ${storeInfo.state || ''}`;
  const senderZip = storeInfo.zipCode || '';

  const serviceName = order.shipping_service || 'Correios';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Etiqueta de Envio - Pedido #${order.id.split('-')[0].toUpperCase()}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 10px; display: flex; justify-content: center; }
        .label-container { width: 380px; border: 2px dashed #000; padding: 20px; box-sizing: border-box; position: relative; }
        .logo-service { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
        .logo-service .service { font-size: 24px; font-weight: bold; border: 3px solid #000; padding: 4px 12px; text-transform: uppercase; }
        .section { margin-bottom: 12px; }
        .section-title { font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; margin-bottom: 4px; }
        .name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .address-detail { font-size: 12px; line-height: 1.3; }
        .zip-code { font-size: 18px; font-weight: bold; margin-top: 6px; letter-spacing: 1px; }
        .barcode { height: 50px; background: repeating-linear-gradient(90deg, #000, #000 2px, #white 2px, #white 6px); margin: 8px 0; border: 1px solid #000; }
        .sender-box { border-top: 1px solid #999; padding-top: 8px; margin-top: 16px; font-size: 10px; line-height: 1.3; }
        @media print {
          body { margin: 0; }
          .label-container { border: 2px dashed #000; }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="logo-service">
          <div style="font-weight: bold; font-size: 14px;">LITTLE Palm CO.</div>
          <div class="service">${serviceName}</div>
        </div>

        <div class="section">
          <div class="section-title">Destinatário</div>
          <div class="name">${recipientName}</div>
          <div class="address-detail">
            ${recipientAddress}<br/>
            ${recipientNeighborhood}<br/>
            <strong>${recipientCityState}</strong>
          </div>
          <div class="zip-code">CEP: ${recipientZip}</div>
          <div class="barcode" title="Código de barras postal"></div>
          ${recipientPhone ? `<div style="font-size: 10px; margin-top: 4px;">Contato: ${recipientPhone}</div>` : ''}
        </div>

        <div class="sender-box">
          <div class="section-title">Remetente</div>
          <strong>${senderName}</strong><br/>
          ${senderAddress}<br/>
          ${senderCityState}<br/>
          CEP: ${senderZip}
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}
