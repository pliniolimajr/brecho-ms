import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useStoreSettings } from '../hooks/useStoreSettings';
import type { Product } from '../types';

import { AdminInventory } from '../features/admin/AdminInventory';
import { AdminOrders } from '../features/admin/AdminOrders';
import { AdminCustomers } from '../features/admin/AdminCustomers';
import { AdminAbandonedCarts } from '../features/admin/AdminAbandonedCarts';
import { AdminMetrics } from '../features/admin/AdminMetrics';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'customers' | 'abandoned' | 'metrics'>('inventory');

  const adminTabs = [
    { id: 'inventory', label: 'Estoque' },
    { id: 'orders', label: 'Pedidos' },
    { id: 'customers', label: 'Clientes' },
    { id: 'abandoned', label: 'Carrinhos' },
    { id: 'metrics', label: 'Métricas' },
  ];

  // Store Info & Shared Data
  const { storeInfo } = useStoreSettings();
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Abandoned Carts States
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [loadingAbandoned, setLoadingAbandoned] = useState(false);

  // CRM States
  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(false);

  // Coupons States
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minPurchaseAmount: 0
  });

  const fetchAdminProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(row => ({
        id: row.id,
        name: row.name,
        tagline: row.tagline,
        description: row.description,
        longDescription: row.long_description,
        price: Number(row.price),
        category: row.category,
        imageUrl: row.image_url,
        gallery: row.gallery,
        features: row.features,
        isSold: row.is_sold,
        brand: row.brand,
        color: row.color,
        material: row.material,
        measurements: row.measurements,
        stockQuantity: row.stock_quantity,
        size: row.size
      }));
      setAdminProducts(mapped);
    }
    setLoading(false);
  };

  const fetchAdminOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(price, products(name, size))')
      .order('created_at', { ascending: false });
    
    if (data) setAdminOrders(data);
    setLoading(false);
  };

  const fetchCRMData = async () => {
    setLoadingCRM(true);
    try {
      const { data: customerRows, error: customerError } = await supabase.from('customers').select('*');
      const { data: orderRows, error: orderError } = await supabase.from('orders').select('*');
      
      if (customerError) console.error(customerError);
      if (orderError) console.error(orderError);

      const orders = orderRows || [];
      const profiles = customerRows || [];
      const crmMap: Record<string, any> = {};

      profiles.forEach(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem Nome';
        crmMap[p.user_id] = {
          id: p.id,
          name,
          phone: p.phone || 'N/A',
          cpf: p.cpf || 'N/A',
          birthDate: p.birth_date || 'N/A',
          ordersCount: 0,
          totalSpent: 0,
          lastPurchaseDate: null,
          type: 'customer',
          userId: p.user_id,
          createdAt: p.created_at
        };
      });

      orders.forEach(order => {
        const isCancelled = order.status === 'cancelled';
        const total = Number(order.total_amount) || 0;
        
        if (order.user_id && crmMap[order.user_id]) {
          const c = crmMap[order.user_id];
          c.ordersCount += 1;
          if (!isCancelled) c.totalSpent += total;
          if (!c.lastPurchaseDate || new Date(order.created_at) > new Date(c.lastPurchaseDate)) {
            c.lastPurchaseDate = order.created_at;
          }
        } else {
          const address = order.shipping_address || {};
          const name = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Visitante';
          const phone = address.phone || 'N/A';
          const guestKey = `guest_${name}_${phone}`;
          
          if (!crmMap[guestKey]) {
            crmMap[guestKey] = {
              id: guestKey,
              name,
              phone,
              ordersCount: 0,
              totalSpent: 0,
              lastPurchaseDate: null,
              type: 'guest',
              createdAt: order.created_at
            };
          }
          const g = crmMap[guestKey];
          g.ordersCount += 1;
          if (!isCancelled) g.totalSpent += total;
          if (!g.lastPurchaseDate || new Date(order.created_at) > new Date(g.lastPurchaseDate)) {
            g.lastPurchaseDate = order.created_at;
          }
        }
      });

      setCrmCustomers(Object.values(crmMap));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCRM(false);
    }
  };

  const fetchAbandonedCarts = async () => {
    setLoadingAbandoned(true);
    try {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('status', 'abandoned')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (data) setAbandonedCarts(data);
    } catch (err) {
      console.error('Erro ao buscar carrinhos abandonados:', err);
    } finally {
      setLoadingAbandoned(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCoupons(data);
    setLoadingCoupons(false);
  };

  useEffect(() => {
    fetchAdminProducts();
    fetchAdminOrders();
    fetchCoupons();
    fetchCRMData();
    fetchAbandonedCarts();
  }, []);

  useEffect(() => {
    if (activeTab === 'abandoned') {
      fetchAbandonedCarts();
    }
  }, [activeTab]);

  const handleExportCSV = () => {
    if (adminOrders.length === 0) return;
    const headers = ['ID Pedido', 'Data', 'Cliente', 'Telefone', 'Itens', 'Total', 'Metodo Pagamento', 'Status'];
    const rows = adminOrders.map(order => {
      const dateStr = new Date(order.created_at).toLocaleDateString('pt-BR');
      const clientName = `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim();
      const phone = order.shipping_address?.phone || 'N/A';
      const itemsStr = order.order_items?.map((item: any) => `${item.products?.name || 'Produto'} (${item.products?.size || 'U'})`).join('; ') || '';
      const totalStr = Number(order.total_amount).toFixed(2);
      
      return [
        order.id,
        dateStr,
        `"${clientName.replace(/"/g, '""')}"`,
        phone,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalStr,
        order.payment_method,
        order.status
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_palm_co_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines: string[][] = [];
        let currentLine: string[] = [];
        let currentWord = '';
        let insideQuote = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (insideQuote && nextChar === '"') {
              currentWord += '"';
              i++;
            } else {
              insideQuote = !insideQuote;
            }
          } else if ((char === ',' || char === ';') && !insideQuote) {
            currentLine.push(currentWord.trim());
            currentWord = '';
          } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            currentLine.push(currentWord.trim());
            lines.push(currentLine);
            currentLine = [];
            currentWord = '';
          } else {
            currentWord += char;
          }
        }
        if (currentWord || currentLine.length > 0) {
          currentLine.push(currentWord.trim());
          lines.push(currentLine);
        }

        if (lines.length <= 1) {
          alert('CSV vazio ou inválido. A primeira linha deve conter os cabeçalhos.');
          return;
        }

        const headers = lines[0].map(h => h.toLowerCase().trim());
        const productsToInsert = [];

        for (let idx = 1; idx < lines.length; idx++) {
          const row = lines[idx];
          if (row.length < headers.length || row.every(cell => cell === '')) continue;

          const item: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            item[header] = row[colIdx];
          });

          productsToInsert.push({
            name: item.name || 'Produto Sem Nome',
            tagline: item.tagline || null,
            description: item.description || '',
            long_description: item.long_description || item.description || '',
            price: Number(item.price) || 0,
            category: item.category || 'Outros',
            size: item.size || 'ÚNICO',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800',
            brand: item.brand || null,
            material: item.material || null,
            color: item.color ? item.color.split(',').map((c: string) => c.trim()) : [],
            features: item.features ? item.features.split(',').map((f: string) => f.trim()) : [],
            stock_quantity: Number(item.stock_quantity) || 1,
            is_sold: false
          });
        }

        if (productsToInsert.length === 0) {
          alert('Nenhum produto válido encontrado no CSV.');
          return;
        }

        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) {
          alert('Erro ao importar produtos: ' + error.message);
        } else {
          alert(`${productsToInsert.length} produtos importados com sucesso!`);
          fetchAdminProducts();
        }
      } catch (err: any) {
        alert('Erro ao processar arquivo: ' + err.message);
      }
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('coupons')
      .insert({
        code: newCoupon.code,
        discount_type: newCoupon.discountType,
        discount_value: newCoupon.discountValue,
        min_purchase_amount: newCoupon.minPurchaseAmount
      });
    if (error) {
      alert('Erro ao criar cupom: ' + error.message);
    } else {
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 0, minPurchaseAmount: 0 });
      setShowNewCouponForm(false);
      fetchCoupons();
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      alert('Erro ao atualizar cupom: ' + error.message);
    } else {
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Deseja excluir este cupom permanentemente?')) return;
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);
    if (error) {
      alert('Erro ao deletar cupom: ' + error.message);
    } else {
      fetchCoupons();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] pt-8 pb-24 px-6 md:px-12 animate-fade-in-up">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between border-b border-[#C06A35]/20 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-serif text-[#1A332B] mb-1">Painel de Controle</h1>
            <p className="text-xs text-[#423226] opacity-70 uppercase tracking-widest font-sans">
              Admin Palm Co.
            </p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Sidebar Menu - Exact Minha Conta / Shoulder Style */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="flex flex-col space-y-1">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-left px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                    activeTab === tab.id 
                      ? 'border-[#C06A35] text-[#1A332B] bg-white font-semibold shadow-sm' 
                      : 'border-transparent text-gray-500 hover:text-[#1A332B] hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="my-2 border-t border-gray-200"></div>

              <a
                href="/catalogo"
                target="_blank"
                rel="noreferrer"
                className="text-left px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#1A332B] hover:bg-white/50 transition-colors border-l-2 border-transparent block"
              >
                Ver Loja ↗
              </a>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-left px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-700 transition-colors border-l-2 border-transparent"
              >
                Sair
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'inventory' && (
              <AdminInventory
                adminProducts={adminProducts}
                loading={loading}
                fetchAdminProducts={fetchAdminProducts}
                handleCSVImport={handleCSVImport}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrders
                adminOrders={adminOrders}
                loading={loading}
                storeInfo={storeInfo}
                fetchAdminOrders={fetchAdminOrders}
                fetchCRMData={fetchCRMData}
                handleExportCSV={handleExportCSV}
              />
            )}

            {activeTab === 'customers' && (
              <AdminCustomers
                crmCustomers={crmCustomers}
                loadingCRM={loadingCRM}
              />
            )}

            {activeTab === 'abandoned' && (
              <AdminAbandonedCarts
                abandonedCarts={abandonedCarts}
                loadingAbandoned={loadingAbandoned}
              />
            )}

            {activeTab === 'metrics' && (
              <AdminMetrics
                adminOrders={adminOrders}
                coupons={coupons}
                loadingCoupons={loadingCoupons}
                fetchCoupons={fetchCoupons}
                handleCreateCoupon={handleCreateCoupon}
                handleToggleCoupon={handleToggleCoupon}
                handleDeleteCoupon={handleDeleteCoupon}
                newCoupon={newCoupon}
                setNewCoupon={setNewCoupon}
                showNewCouponForm={showNewCouponForm}
                setShowNewCouponForm={setShowNewCouponForm}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}