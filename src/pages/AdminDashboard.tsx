import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabaseClient';
import type { Product } from '../types';

export function AdminDashboard() {
  const { fetchProducts } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  // Recarregar os produtos (inclusive os vendidos para o admin ver)
  // O fetchProducts da loja ignora os vendidos, então vamos fazer um fetch específico do admin
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'metrics'>('inventory');

  const metrics = React.useMemo(() => {
    const paidOrDelivered = adminOrders.filter(o => o.status === 'paid' || o.status === 'delivered');
    const totalSales = paidOrDelivered.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = adminOrders.length;
    const completedOrdersCount = paidOrDelivered.length;
    const averageTicket = completedOrdersCount > 0 ? totalSales / completedOrdersCount : 0;
    
    // Group by month
    const monthlySales: Record<string, number> = {};
    paidOrDelivered.forEach(o => {
      const date = new Date(o.created_at);
      const key = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      monthlySales[capitalizedKey] = (monthlySales[capitalizedKey] || 0) + Number(o.total_amount);
    });

    return {
      totalSales,
      totalOrders,
      completedOrdersCount,
      averageTicket,
      monthlySales: Object.entries(monthlySales).map(([month, val]) => ({ month, val })),
      cancelledCount: adminOrders.filter(o => o.status === 'cancelled').length,
    };
  }, [adminOrders]);

  const handleExportCSV = () => {
    if (adminOrders.length === 0) return;
    
    const headers = [
      'ID Pedido', 
      'Data', 
      'Cliente', 
      'Telefone', 
      'Itens', 
      'Total', 
      'Metodo Pagamento', 
      'Status'
    ];
    
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

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minPurchaseAmount: 0
  });

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setCoupons(data);
    }
    setLoadingCoupons(false);
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

  useEffect(() => {
    fetchAdminProducts();
    fetchAdminOrders();
    fetchCoupons();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esse produto?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchAdminProducts();
    fetchProducts(); // Atualiza a vitrine
  };

  const handleMarkAsSold = async (id: string, currentStatus: boolean) => {
    await supabase.from('products').update({ is_sold: !currentStatus }).eq('id', id);
    fetchAdminProducts();
    fetchProducts(); // Atualiza a vitrine
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert('Erro ao atualizar status do pedido. Verifique se você tem permissão de Admin.');
    } else {
      fetchAdminOrders();
    }
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
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
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
          fetchProducts();
        }
      } catch (err: any) {
        alert('Erro ao processar arquivo: ' + err.message);
      }
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: editingProduct.name,
      tagline: editingProduct.tagline,
      description: editingProduct.description,
      long_description: editingProduct.longDescription,
      price: editingProduct.price,
      category: editingProduct.category || 'Outros',
      size: editingProduct.size || 'ÚNICO',
      image_url: editingProduct.imageUrl,
      features: editingProduct.features || [],
      brand: editingProduct.brand || null,
      color: editingProduct.color || [],
      material: editingProduct.material || null,
      measurements: editingProduct.measurements || null,
      stock_quantity: editingProduct.stockQuantity || 1,
    };

    if (editingProduct.id) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert(payload);
    }

    setIsEditing(false);
    setEditingProduct({});
    fetchAdminProducts();
    fetchProducts(); // Atualiza a vitrine
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      alert('Erro ao fazer upload: ' + uploadError.message);
    } else {
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setEditingProduct({...editingProduct, imageUrl: data.publicUrl});
    }
    setUploadingImage(false);
  };

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8 flex justify-between items-center border-b border-[#C06A35]/30 pb-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1A332B]">Painel de Controle</h1>
          <div className="flex gap-6 mt-4">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
            >
              Estoque
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'orders' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
            >
              Pedidos
            </button>
            <button 
              onClick={() => setActiveTab('metrics')}
              className={`text-sm font-medium uppercase tracking-widest pb-2 border-b-2 transition-colors ${activeTab === 'metrics' ? 'border-[#C06A35] text-[#C06A35]' : 'border-transparent text-[#A8A29E] hover:text-[#423226]'}`}
            >
              Métricas
            </button>
          </div>
        </div>
        
        {activeTab === 'inventory' && (
          <div className="flex items-center gap-3">
            <label className="border border-[#1A332B] text-[#1A332B] px-6 py-2 rounded text-sm font-medium uppercase tracking-widest hover:bg-[#1A332B]/5 cursor-pointer transition-colors inline-block">
              Importar CSV
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVImport} 
                className="hidden" 
              />
            </label>
            <button 
              onClick={() => { setEditingProduct({ category: 'Outros', features: [] }); setIsEditing(true); }}
              className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 rounded text-sm font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors"
            >
              + Adicionar Produto
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <button 
            onClick={handleExportCSV}
            className="border border-[#1A332B] text-[#1A332B] px-6 py-2 rounded text-sm font-medium uppercase tracking-widest hover:bg-[#1A332B]/5 transition-colors"
          >
            Exportar CSV
          </button>
        )}
      </header>

      {activeTab === 'inventory' && isEditing ? (
        <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 space-y-4 mb-8">
          <h2 className="text-xl font-serif text-[#1A332B] mb-4">
            {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Nome do produto" className="border p-2" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
            <input placeholder="Tagline (ex: Edição limitada)" className="border p-2" value={editingProduct.tagline || ''} onChange={e => setEditingProduct({...editingProduct, tagline: e.target.value})} />
            <input required placeholder="Preço" type="number" step="0.01" className="border p-2" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
            <select className="border p-2" value={editingProduct.category || 'Outros'} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}>
              <option value="Todos">Todos</option>
              <option value="Vestidos">Vestidos</option>
              <option value="Calças">Calças</option>
              <option value="Saias">Saias</option>
              <option value="Camisetas">Camisetas</option>
              <option value="Casacos">Casacos</option>
              <option value="Acessórios">Acessórios</option>
              <option value="Calçados">Calçados</option>
              <option value="Outros">Outros</option>
            </select>
            <select className="border p-2" value={editingProduct.size || 'ÚNICO'} onChange={e => setEditingProduct({...editingProduct, size: e.target.value as any})}>
              <option value="PP">PP</option>
              <option value="P">P</option>
              <option value="M">M</option>
              <option value="G">G</option>
              <option value="GG">GG</option>
              <option value="ÚNICO">ÚNICO</option>
              <option value="34">34</option>
              <option value="36">36</option>
              <option value="38">38</option>
              <option value="40">40</option>
              <option value="42">42</option>
              <option value="44">44</option>
              <option value="46">46</option>
              <option value="48">48</option>
            </select>
            <input placeholder="Marca" className="border p-2" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
            <input placeholder="Cores (ex: Preto, Branco, Cinza)" className="border p-2" value={editingProduct.color?.join(', ') || ''} onChange={e => setEditingProduct({...editingProduct, color: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} />
            <input placeholder="Material (ex: Algodão, Linho)" className="border p-2" value={editingProduct.material || ''} onChange={e => setEditingProduct({...editingProduct, material: e.target.value})} />
            <input placeholder="Estoque" type="number" min="0" className="border p-2" value={editingProduct.stockQuantity ?? 1} onChange={e => setEditingProduct({...editingProduct, stockQuantity: Number(e.target.value)})} />
            
            <input 
              placeholder="Medidas (ex: Comprimento: 70cm, Busto: 100cm)" 
              className="border p-2 col-span-2" 
              value={
                editingProduct.measurements 
                  ? Object.entries(editingProduct.measurements).map(([k, v]) => `${k}: ${v}`).join(', ') 
                  : ''
              } 
              onChange={e => {
                const obj: Record<string, string> = {};
                e.target.value.split(',').forEach(item => {
                  const parts = item.split(':');
                  if (parts.length === 2) {
                    obj[parts[0].trim()] = parts[1].trim();
                  }
                });
                setEditingProduct({...editingProduct, measurements: Object.keys(obj).length > 0 ? obj : null});
              }} 
            />
          </div>
          
          <div className="border p-4 bg-gray-50 flex flex-col gap-2">
            <label className="text-sm font-bold text-[#423226]">Foto do Produto</label>
            <div className="flex items-center gap-4">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
              {uploadingImage && <span className="text-xs text-blue-600">Enviando...</span>}
            </div>
            {editingProduct.imageUrl && (
              <img src={editingProduct.imageUrl} alt="Preview" className="h-24 w-24 object-cover mt-2 rounded border" />
            )}
            <p className="text-xs text-gray-500 mt-2">Ou cole o link direto da imagem:</p>
            <input placeholder="URL da Imagem principal" className="border p-2 w-full text-sm" value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} />
          </div>

          <textarea required placeholder="Descrição curta" className="border p-2 w-full" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
          <textarea placeholder="Descrição Longa" className="border p-2 w-full" value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} />
          <div className="flex gap-4 pt-4">
            <button type="submit" className="bg-[#C06A35] text-[#FDF6F0] px-6 py-2 rounded">Salvar</button>
            <button type="button" onClick={() => setIsEditing(false)} className="text-[#423226] underline">Cancelar</button>
          </div>
        </form>
      ) : null}

      {activeTab === 'inventory' && !isEditing && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-[#C06A35]/30 rounded text-xs text-[#423226] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="font-bold mb-1">💡 Dica para Importação de CSV:</p>
              <p>O cabeçalho do arquivo deve conter as colunas: <code className="font-mono text-amber-800 bg-[#FDF6F0] px-1 py-0.5 rounded">name, tagline, description, price, category, size, image_url, brand, material, color, features, stock_quantity</code>.</p>
              <p className="text-gray-500 mt-1">Cores e Características devem ser separadas por vírgula. Exemplo: <code className="font-mono">"Preto, Branco"</code>.</p>
            </div>
            <button 
              onClick={() => {
                const headers = ['name', 'tagline', 'description', 'price', 'category', 'size', 'image_url', 'brand', 'material', 'color', 'features', 'stock_quantity'];
                const sampleRow = ['Camisa de Linho Leve', '100% linho italiano', 'Camisa clássica de linho premium', '189.90', 'Camisetas', 'G', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b', 'Palm Co.', 'Linho', 'Bege, Branco', 'Manga longa, Tecido respirável', '5'];
                const csvContent = "data:text/csv;charset=utf-8," 
                  + [headers.join(','), sampleRow.map(v => `"${v}"`).join(',')].join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "modelo_produtos_palm_co.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="text-[#C06A35] underline hover:text-[#1A332B] font-medium whitespace-nowrap"
            >
              Baixar Modelo CSV
            </button>
          </div>

          <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#423226]">Carregando catálogo...</div>
          ) : adminProducts.length === 0 ? (
            <div className="p-8 text-center text-[#423226]">Nenhum produto cadastrado.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4E4D4] text-[#1A332B] border-b border-[#C06A35]/30">
                  <th className="p-4 font-medium">Produto</th>
                  <th className="p-4 font-medium">Categoria</th>
                  <th className="p-4 font-medium">Preço</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {adminProducts.map((p) => (
                  <tr key={p.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]">
                    <td className="p-4 flex items-center gap-3">
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded" />
                      <span className="font-serif">{p.name}</span>
                    </td>
                    <td className="p-4 text-sm">{p.category}</td>
                    <td className="p-4 text-sm">R$ {p.price.toFixed(2).replace('.', ',')}</td>
                    <td className="p-4 text-sm">
                      {p.isSold ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Vendido</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Disponível</span>
                      )}
                    </td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => { setEditingProduct(p); setIsEditing(true); }} className="text-xs text-blue-600 underline">Editar</button>
                      <button onClick={() => handleMarkAsSold(p.id, !!p.isSold)} className="text-xs text-orange-600 underline">
                        {p.isSold ? 'Desmarcar Venda' : 'Marcar Vendido'}
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 underline">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#423226]">Carregando pedidos...</div>
        ) : adminOrders.length === 0 ? (
          <div className="p-8 text-center text-[#423226]">Nenhum pedido realizado ainda.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4E4D4] text-[#1A332B] border-b border-[#C06A35]/30">
                <th className="p-4 font-medium text-sm">Pedido / Data</th>
                <th className="p-4 font-medium text-sm">Cliente (Contato)</th>
                <th className="p-4 font-medium text-sm">Produtos</th>
                <th className="p-4 font-medium text-sm">Total</th>
                <th className="p-4 font-medium text-sm">Status / Ação</th>
              </tr>
            </thead>
            <tbody>
              {adminOrders.map((order) => (
                <tr key={order.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0] align-top">
                  <td className="p-4">
                    <span className="font-mono text-xs text-[#423226] block mb-1">{order.id.split('-')[0].toUpperCase()}</span>
                    <span className="text-xs text-[#A8A29E]">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-[#1A332B] block text-sm">{order.shipping_address?.firstName} {order.shipping_address?.lastName}</span>
                    <span className="text-xs text-[#423226] block">Tel: {order.shipping_address?.phone || 'N/A'}</span>
                    <span className="text-xs text-[#A8A29E] block">Pagamento: <span className="uppercase font-bold">{order.payment_method}</span></span>
                  </td>
                  <td className="p-4">
                    <ul className="text-xs text-[#423226] space-y-1 list-disc pl-4">
                      {order.order_items?.map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.products?.name} ({item.products?.size})
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-4 font-serif text-[#1A332B] text-sm">
                    R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="border border-[#C06A35]/50 p-1 text-xs text-[#1A332B] bg-transparent outline-none cursor-pointer"
                    >
                      <option value="pending">Aguardando Pagamento</option>
                      <option value="paid">Pago (Pronto p/ Retirada)</option>
                      <option value="delivered">Entregue / Retirado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
              <span className="text-xs uppercase tracking-widest text-[#A8A29E] font-medium">Total de Vendas</span>
              <h3 className="text-2xl font-serif font-bold text-[#1A332B] mt-2">
                R$ {metrics.totalSales.toFixed(2).replace('.', ',')}
              </h3>
            </div>
            
            <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
              <span className="text-xs uppercase tracking-widest text-[#A8A29E] font-medium">Pedidos Concluídos</span>
              <h3 className="text-2xl font-serif font-bold text-[#1A332B] mt-2">
                {metrics.completedOrdersCount} / {metrics.totalOrders}
              </h3>
            </div>
            
            <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
              <span className="text-xs uppercase tracking-widest text-[#A8A29E] font-medium">Ticket Médio</span>
              <h3 className="text-2xl font-serif font-bold text-[#1A332B] mt-2">
                R$ {metrics.averageTicket.toFixed(2).replace('.', ',')}
              </h3>
            </div>

            <div className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20">
              <span className="text-xs uppercase tracking-widest text-[#A8A29E] font-medium">Pedidos Cancelados</span>
              <h3 className="text-2xl font-serif font-bold text-red-700 mt-2">
                {metrics.cancelledCount}
              </h3>
            </div>
          </div>

          {/* Monthly Performance Chart */}
          <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20">
            <h3 className="text-lg font-serif text-[#1A332B] mb-6">Desempenho de Vendas por Mês</h3>
            {metrics.monthlySales.length === 0 ? (
              <p className="text-sm text-[#A8A29E] text-center py-8">Nenhuma venda registrada ainda para gerar o gráfico.</p>
            ) : (
              <div className="space-y-6">
                {metrics.monthlySales.map(({ month, val }) => {
                  const maxVal = Math.max(...metrics.monthlySales.map(m => m.val), 1);
                  const percentage = (val / maxVal) * 100;
                  return (
                    <div key={month} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[#423226]">{month}</span>
                        <span className="font-bold text-[#1A332B]">R$ {val.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#C06A35] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coupon Management Section */}
          <div className="bg-white p-8 rounded shadow-sm border border-[#C06A35]/20 space-y-6">
            <div className="flex justify-between items-center border-b border-[#C06A35]/30 pb-4">
              <h3 className="text-lg font-serif text-[#1A332B]">Gerenciar Cupons de Desconto</h3>
              <button
                onClick={() => setShowNewCouponForm(!showNewCouponForm)}
                className="bg-[#1A332B] text-white px-4 py-2 rounded text-xs font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors"
              >
                {showNewCouponForm ? 'Fechar Form' : '+ Novo Cupom'}
              </button>
            </div>

            {showNewCouponForm && (
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FDF6F0] p-6 rounded border border-[#C06A35]/20">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Código</label>
                  <input
                    required
                    placeholder="EX: PALM10"
                    className="w-full border p-2 bg-white text-sm"
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Tipo de Desconto</label>
                  <select
                    className="w-full border p-2 bg-white text-sm"
                    value={newCoupon.discountType}
                    onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value as 'fixed' | 'percentage'})}
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Valor</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder={newCoupon.discountType === 'percentage' ? '10' : '15.00'}
                    className="w-full border p-2 bg-white text-sm"
                    value={newCoupon.discountValue || ''}
                    onChange={e => setNewCoupon({...newCoupon, discountValue: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#423226] font-bold mb-2">Compra Mínima</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full border p-2 bg-white text-sm"
                    value={newCoupon.minPurchaseAmount || ''}
                    onChange={e => setNewCoupon({...newCoupon, minPurchaseAmount: Number(e.target.value)})}
                  />
                </div>
                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-[#C06A35] text-white px-6 py-2 rounded text-xs font-medium uppercase tracking-widest hover:bg-[#a05528]"
                  >
                    Salvar Cupom
                  </button>
                </div>
              </form>
            )}

            {loadingCoupons ? (
              <p className="text-[#A8A29E] text-sm">Buscando cupons...</p>
            ) : coupons.length === 0 ? (
              <p className="text-[#A8A29E] text-sm">Nenhum cupom promocional ativo cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FDF6F0] text-[#1A332B] border-b border-[#C06A35]/20 font-medium">
                      <th className="p-3">Código</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Mínimo</th>
                      <th className="p-3">Usos</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]">
                        <td className="p-3 font-mono font-bold text-[#1A332B]">{c.code}</td>
                        <td className="p-3">{c.discount_type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}</td>
                        <td className="p-3">
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`}
                        </td>
                        <td className="p-3">R$ {Number(c.min_purchase_amount).toFixed(2).replace('.', ',')}</td>
                        <td className="p-3">{c.used_count}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {c.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          <button
                            onClick={() => handleToggleCoupon(c.id, c.is_active)}
                            className="text-xs text-orange-600 underline"
                          >
                            {c.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="text-xs text-red-600 underline"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}