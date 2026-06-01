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
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');

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
        isSold: row.is_sold
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

  useEffect(() => {
    fetchAdminProducts();
    fetchAdminOrders();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar essa peça?')) return;
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
          </div>
        </div>
        
        {activeTab === 'inventory' && (
          <button 
            onClick={() => { setEditingProduct({ category: 'Outros', features: [] }); setIsEditing(true); }}
            className="bg-[#1A332B] text-[#FDF6F0] px-6 py-2 rounded text-sm font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors"
          >
            + Adicionar Peça
          </button>
        )}
      </header>

      {activeTab === 'inventory' && isEditing ? (
        <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 space-y-4 mb-8">
          <h2 className="text-xl font-serif text-[#1A332B] mb-4">
            {editingProduct.id ? 'Editar Peça' : 'Nova Peça'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Nome do produto" className="border p-2" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
            <input placeholder="Tagline (ex: Peça exclusiva)" className="border p-2" value={editingProduct.tagline || ''} onChange={e => setEditingProduct({...editingProduct, tagline: e.target.value})} />
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
            </select>
          </div>
          
          <div className="border p-4 bg-gray-50 flex flex-col gap-2">
            <label className="text-sm font-bold text-[#423226]">Foto da Peça</label>
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
        <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#423226]">Carregando catálogo...</div>
          ) : adminProducts.length === 0 ? (
            <div className="p-8 text-center text-[#423226]">Nenhum garimpo cadastrado.</div>
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
                <th className="p-4 font-medium text-sm">Peças</th>
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

    </div>
  );
}