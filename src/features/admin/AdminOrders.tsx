import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/Toast';

interface AdminOrdersProps {
  adminOrders: any[];
  loading: boolean;
  storeInfo: any;
  fetchAdminOrders: () => Promise<void>;
  fetchCRMData: () => Promise<void>;
  handleExportCSV: () => void;
}

export function AdminOrders({
  adminOrders,
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

  const logStatusHistory = async (orderId: string, action: string, details?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const changedBy = session?.user?.email || 'admin';

      const { data: order } = await supabase
        .from('orders')
        .select('status_history, shipping_address')
        .eq('id', orderId)
        .single();

      if (!order) return;

      const history = Array.isArray(order.status_history)
        ? order.status_history
        : (order.shipping_address && Array.isArray(order.shipping_address.statusHistory))
        ? order.shipping_address.statusHistory
        : [];

      const newEntry = {
        timestamp: new Date().toISOString(),
        action,
        changed_by: changedBy,
        details: details || ''
      };

      const updatedHistory = [...history, newEntry];

      // Tenta atualizar a coluna status_history dedicada
      const { error: colError } = await supabase
        .from('orders')
        .update({ status_history: updatedHistory })
        .eq('id', orderId);

      // Fallback para shipping_address caso a coluna não exista
      if (colError) {
        const updatedAddress = {
          ...order.shipping_address,
          statusHistory: updatedHistory
        };
        await supabase
          .from('orders')
          .update({ shipping_address: updatedAddress })
          .eq('id', orderId);
      }
    } catch (e) {
      console.warn('Falha ao registrar histórico de status:', e);
    }
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

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      showToast('Erro ao atualizar status do pedido. Verifique se você tem permissão de Admin.', 'error');
    } else {
      await logStatusHistory(orderId, `Status alterado para "${friendlyStatus}"`);
      fetchAdminOrders();
      fetchCRMData();
    }
  };

  const handleSaveTrackingCode = async (orderId: string, code: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: code })
        .eq('id', orderId);
      if (error) throw error;

      await logStatusHistory(orderId, `Código de rastreio atualizado`, `Código: ${code}`);
      fetchAdminOrders();
      setEditingTrackingId(null);
      showToast('Código de rastreio atualizado com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar código de rastreio.', 'error');
    }
  };

  const handleSimulateShippingLabel = async (orderId: string) => {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    const mockTracking = `LP${randomDigits}BR`;
    const mockPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_code: mockTracking,
          shipping_carrier: 'Correios',
          shipping_service: 'PAC (SuperFrete)',
          shipping_label_url: mockPdfUrl
        })
        .eq('id', orderId);
      if (error) throw error;

      await logStatusHistory(orderId, `Etiqueta de Envio emitida via SuperFrete`, `Rastreio: ${mockTracking}`);
      fetchAdminOrders();
      showToast(`Etiqueta de Envio emitida com sucesso via SuperFrete! Rastreamento gerado: ${mockTracking}`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao emitir etiqueta.', 'error');
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = adminOrders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const clientName = `${o.shipping_address?.firstName || ''} ${o.shipping_address?.lastName || ''}`.toLowerCase();
      const orderId = (o.id || '').toLowerCase();
      const phone = (o.shipping_address?.phone || '').toLowerCase();
      const itemNames = (o.order_items || []).map((i: any) => (i.products?.name || '').toLowerCase()).join(' ');

      return (
        clientName.includes(q) ||
        orderId.includes(q) ||
        phone.includes(q) ||
        itemNames.includes(q)
      );
    }

    return true;
  });

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
      <div className="bg-white p-4 rounded shadow-sm border border-[#C06A35]/20 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#423226] mr-2">Status:</span>
          {['all', 'pending', 'paid', 'delivered', 'cancelled'].map((st) => (
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
              {st === 'delivered' && 'Entregue'}
              {st === 'cancelled' && 'Cancelado'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por ID, cliente, telefone ou produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FDF6F0] border border-[#C06A35]/30 rounded px-3 py-1.5 text-xs text-[#1A332B] placeholder-gray-400 focus:outline-none focus:border-[#1A332B]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-[#1A332B] font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando pedidos...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum pedido encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDF6F0] border-b border-[#C06A35]/20 text-[#1A332B] font-medium text-sm">
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
                {filteredOrders.map(order => {
                  const clientName = `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim() || 'Cliente';
                  const dateStr = new Date(order.created_at).toLocaleDateString('pt-BR');
                  const history = Array.isArray(order.status_history)
                    ? order.status_history
                    : (order.shipping_address && Array.isArray(order.shipping_address.statusHistory))
                    ? order.shipping_address.statusHistory
                    : [];

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]/50 transition-colors">
                        <td 
                          className="p-4 cursor-pointer hover:underline"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
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
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-semibold"
                          >
                            <option value="pending">Pendente</option>
                            <option value="paid">Pago</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregue</option>
                            <option value="cancelled">Cancelado</option>
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
                                className="bg-green-700 text-white text-xs px-2 py-1 rounded"
                              >
                                OK
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
                                <button
                                  onClick={() => handleSimulateShippingLabel(order.id)}
                                  className="text-[10px] bg-[#1A332B] text-white px-2 py-0.5 rounded hover:bg-[#433E38]"
                                >
                                  Emitir Etiqueta
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
                          <td colSpan={7} className="p-6">
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
                                  {history.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Nenhum evento registrado no histórico.</p>
                                  ) : (
                                    <div className="relative border-l border-gray-200 pl-4 ml-1.5 space-y-3 text-left">
                                      {history.map((h: any, idx: number) => (
                                        <div key={idx} className="relative">
                                          <div className="absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full bg-[#C06A35] border border-white" />
                                          <div className="text-xs">
                                            <span className="font-semibold text-[#1A332B] block">{h.action}</span>
                                            <span className="text-[10px] text-gray-500 block">
                                              {new Date(h.timestamp).toLocaleString('pt-BR')} • por {h.changed_by}
                                            </span>
                                            {h.details && <p className="text-[10px] text-gray-400 mt-0.5">{h.details}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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
