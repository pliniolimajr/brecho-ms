import React, { useState, useEffect } from 'react';
import { TableSkeleton } from '../../components/LoadingStates';
import { supabase } from '../../services/supabaseClient';
import { useStore } from '../../store/useStore';
import type { Product } from '../../types';
import { useToast } from '../../components/Toast';
import { prepareProductImage, validateImageFile } from '../../utils/imageUpload';
import { AdminCsvImport } from './AdminCsvImport';

interface AdminInventoryProps {
  adminProducts: Product[];
  loading: boolean;
  fetchAdminProducts: () => Promise<void>;
}

export function AdminInventory({
  adminProducts,
  loading,
  fetchAdminProducts
}: AdminInventoryProps) {
  const { fetchProducts } = useStore();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('physical_count');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  const [inventoryMovements, setInventoryMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Inventory Filtering & Sorting & Pagination States
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySort, setInventorySort] = useState<string>('newest');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryScope, setInventoryScope] = useState<'active' | 'archived'>('active');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventorySort, inventoryScope]);

  const filteredAndSortedProducts = React.useMemo(() => {
    let result = adminProducts.filter(product => inventoryScope === 'archived' ? !!product.archivedAt : !product.archivedAt);
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (inventorySort === 'name_asc') return a.name.localeCompare(b.name);
      if (inventorySort === 'name_desc') return b.name.localeCompare(a.name);
      if (inventorySort === 'price_asc') return a.price - b.price;
      if (inventorySort === 'price_desc') return b.price - a.price;
      if (inventorySort === 'stock_asc') return (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0);
      return 0; // default newest
    });

    return result;
  }, [adminProducts, inventorySearch, inventorySort, inventoryScope]);

  const totalInventoryPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE) || 1;
  
  const paginatedProducts = React.useMemo(() => {
    const start = (inventoryPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, inventoryPage]);

  const handleArchive = async (id: string) => {
    if (!confirm('Arquivar este produto? Ele sairá da loja, mas o histórico será preservado.')) return;
    const { error } = await supabase
      .from('products')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      showToast(`Não foi possível arquivar o produto. ${error.message}`, 'error');
      return;
    }
    showToast('Produto arquivado com sucesso.', 'success');
    await Promise.all([fetchAdminProducts(), fetchProducts()]);
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('products').update({ archived_at: null }).eq('id', id);
    if (error) {
      showToast(`Não foi possível restaurar o produto. ${error.message}`, 'error');
      return;
    }
    showToast('Produto restaurado e devolvido ao estoque.', 'success');
    await Promise.all([fetchAdminProducts(), fetchProducts()]);
  };

  const openInventoryAdjustment = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustmentQuantity(product.stockQuantity ?? 0);
    setAdjustmentReason('physical_count');
    setAdjustmentNote('');
  };

  const handleInventoryAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustingProduct) return;
    setSavingAdjustment(true);
    const { error } = await supabase.rpc('admin_adjust_inventory', {
      p_product_id: adjustingProduct.id,
      p_new_quantity: adjustmentQuantity,
      p_reason: adjustmentReason,
      p_note: adjustmentNote.trim() || null,
    });
    if (error) {
      showToast(`Não foi possível ajustar o estoque. ${error.message}`, 'error');
    } else {
      showToast('Estoque ajustado e registrado no histórico.', 'success');
      setAdjustingProduct(null);
      await Promise.all([fetchAdminProducts(), fetchProducts()]);
    }
    setSavingAdjustment(false);
  };

  const loadMovementHistory = async () => {
    setShowMovementHistory(true);
    setLoadingMovements(true);
    const { data, error } = await supabase.rpc('admin_list_inventory_movements', {
      p_product_id: null,
      p_limit: 100,
    });
    if (error) showToast(`Não foi possível carregar o histórico. ${error.message}`, 'error');
    else setInventoryMovements(data || []);
    setLoadingMovements(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.imageUrl?.trim()) {
      showToast('Adicione a imagem principal antes de salvar o produto.', 'warning');
      return;
    }

    const payload = {
      name: editingProduct.name,
      tagline: editingProduct.tagline,
      description: editingProduct.description,
      long_description: editingProduct.longDescription,
      price: editingProduct.price,
      category: editingProduct.category || 'Outros',
      size: editingProduct.size || 'ÚNICO',
      image_url: editingProduct.imageUrl.trim(),
      gallery: editingProduct.gallery || [],
      features: editingProduct.features || [],
      brand: editingProduct.brand || null,
      color: editingProduct.color || [],
      material: editingProduct.material || null,
      measurements: editingProduct.measurements || null,
      stock_quantity: editingProduct.stockQuantity ?? 1,
      condition: editingProduct.condition || null,
      condition_notes: editingProduct.conditionNotes?.trim() || null,
      sku: editingProduct.sku?.trim().toUpperCase() || null,
      acquisition_cost: editingProduct.acquisitionCost ?? null,
      source: editingProduct.source?.trim() || null,
      acquired_at: editingProduct.acquiredAt || null,
    };

    setSavingProduct(true);
    try {
      const { error } = editingProduct.id
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
        : await supabase.from('products').insert(payload);

      if (error) throw error;

      showToast(editingProduct.id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success');
      setIsEditing(false);
      setEditingProduct({});
      await Promise.all([fetchAdminProducts(), fetchProducts()]);
    } catch (error) {
      console.error('Falha ao salvar produto.', error);
      const message = typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : 'Erro desconhecido.';
      showToast(`Não foi possível salvar o produto. ${message}`, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const originalFile = e.target.files[0];
    const validationError = validateImageFile(originalFile);
    if (validationError) {
      showToast(validationError, 'error');
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const file = await prepareProductImage(originalFile);
      const fileName = `${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: 'image/webp', cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setEditingProduct(current => ({ ...current, imageUrl: data.publicUrl }));
      showToast('Imagem otimizada e enviada com sucesso!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao enviar imagem.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    if (files.length > 8) {
      showToast('Envie no máximo 8 imagens por vez.', 'error');
      e.target.value = '';
      return;
    }
    setUploadingImage(true);

    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const optimizedFile = await prepareProductImage(file);
        const fileName = `${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, optimizedFile, { contentType: 'image/webp', cacheControl: '31536000' });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      } catch (error) {
        console.warn('Imagem ignorada:', file.name, error);
      }
    }

    if (uploadedUrls.length > 0) {
      const currentGallery = editingProduct.gallery || [];
      setEditingProduct({ ...editingProduct, gallery: [...currentGallery, ...uploadedUrls] });
      showToast(`${uploadedUrls.length} imagens adicionadas à galeria!`, 'success');
    } else {
      showToast('Nenhuma imagem pôde ser enviada.', 'error');
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    const currentGallery = editingProduct.gallery || [];
    const updated = currentGallery.filter((_, idx) => idx !== indexToRemove);
    setEditingProduct({ ...editingProduct, gallery: updated });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded shadow-sm border border-[#C06A35]/20">
        <div>
          <h2 className="text-xl font-serif text-[#1A332B]">Gestão de Estoque</h2>
          <p className="text-xs text-gray-500">Cadastre, edite e gerencie o catálogo de produtos</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void loadMovementHistory()} className="border border-[#C06A35] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#9A4D24] hover:bg-[#FDF6F0]">
            Histórico
          </button>
          <AdminCsvImport fetchAdminProducts={fetchAdminProducts} />
          <button 
            onClick={() => { setEditingProduct({ category: 'Outros', features: [] }); setIsEditing(true); }}
            className="bg-[#1A332B] text-[#FDF6F0] border border-[#1A332B] px-5 py-2.5 rounded-none text-xs font-semibold uppercase tracking-widest hover:bg-[#433E38] hover:border-[#433E38] transition-colors"
          >
            + Adicionar Produto
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-sm border border-[#C06A35]/20 space-y-4">
          <h2 className="text-xl font-serif text-[#1A332B] mb-4">
            {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <input placeholder="SKU interno (ex: PALM-0001)" className="border p-2 uppercase" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} />
            <input placeholder="Custo de aquisição" type="number" min="0" step="0.01" className="border p-2" value={editingProduct.acquisitionCost ?? ''} onChange={e => setEditingProduct({...editingProduct, acquisitionCost: e.target.value === '' ? undefined : Number(e.target.value)})} />
            <input placeholder="Origem / fornecedor" className="border p-2" value={editingProduct.source || ''} onChange={e => setEditingProduct({...editingProduct, source: e.target.value})} />
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-[#423226]">
              Data de aquisição
              <input aria-label="Data de aquisição" type="date" className="border p-2 text-sm font-normal normal-case" value={editingProduct.acquiredAt || ''} onChange={e => setEditingProduct({...editingProduct, acquiredAt: e.target.value})} />
            </label>
            <input placeholder="Estoque" type="number" min="0" className="border p-2" value={editingProduct.stockQuantity ?? 1} onChange={e => setEditingProduct({...editingProduct, stockQuantity: Number(e.target.value)})} />
            <select aria-label="Estado de conservação" className="border p-2" value={editingProduct.condition || ''} onChange={e => setEditingProduct({...editingProduct, condition: (e.target.value || undefined) as Product['condition']})}>
              <option value="">Estado de conservação</option>
              <option value="new_with_tags">Novo com etiqueta</option>
              <option value="new_without_tags">Novo sem etiqueta</option>
              <option value="excellent">Excelente estado</option>
              <option value="very_good">Muito bom estado</option>
              <option value="good">Bom estado</option>
            </select>
            <textarea
              aria-label="Observações sobre o estado da peça"
              placeholder="Observações de conservação, marcas de uso ou detalhes relevantes"
              className="border p-2 md:col-span-2"
              rows={3}
              value={editingProduct.conditionNotes || ''}
              onChange={e => setEditingProduct({...editingProduct, conditionNotes: e.target.value})}
            />
            
            <input 
              placeholder="Medidas (ex: Comprimento: 70cm, Busto: 100cm)" 
              className="border p-2 md:col-span-2" 
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
                setEditingProduct({...editingProduct, measurements: obj});
              }} 
            />

            <div className="border p-2 md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#1A332B]">Imagem Principal</label>
              <div className="flex items-center gap-4">
                <input 
                  required
                  placeholder="URL da Imagem Principal" 
                  className="border p-2 flex-1 text-sm" 
                  value={editingProduct.imageUrl || ''} 
                  onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                />
                <label className="bg-[#1A332B] text-white px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest cursor-pointer hover:bg-[#433E38] transition-colors">
                  {uploadingImage ? 'Enviando...' : 'Upload Imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              {editingProduct.imageUrl && (
                <img src={editingProduct.imageUrl} alt="Preview Principal" className="h-20 w-20 object-cover rounded border border-[#C06A35]/30 mt-2" />
              )}
            </div>

            <div className="border p-2 md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#1A332B]">Galeria de Fotos Secundárias</label>
              <div className="flex items-center gap-4">
                <label className="bg-[#C06A35] text-white px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest cursor-pointer hover:bg-[#a05528] transition-colors">
                  {uploadingImage ? 'Enviando...' : '+ Adicionar Fotos para Galeria'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultipleImagesUpload} disabled={uploadingImage} />
                </label>
              </div>

              {editingProduct.gallery && editingProduct.gallery.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {editingProduct.gallery.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Galeria ${idx}`} className="h-20 w-20 object-cover rounded border border-gray-300" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-700 transition-colors"
                        title="Remover Foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <textarea placeholder="Descrição Curta" className="border p-2 md:col-span-2" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
            <textarea placeholder="Descrição Detalhada / Longa" className="border p-2 md:col-span-2" value={editingProduct.longDescription || ''} onChange={e => setEditingProduct({...editingProduct, longDescription: e.target.value})} />
            <input placeholder="Características (separadas por vírgula)" className="border p-2 md:col-span-2" value={editingProduct.features?.join(', ') || ''} onChange={e => setEditingProduct({...editingProduct, features: e.target.value.split(',').map(s => s.trim())})} />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={savingProduct || uploadingImage} className="bg-[#1A332B] text-white px-6 py-2 rounded text-sm uppercase tracking-widest hover:bg-[#433E38] disabled:cursor-not-allowed disabled:opacity-50">
              {savingProduct ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" disabled={savingProduct} onClick={() => setIsEditing(false)} className="border border-gray-300 px-6 py-2 rounded text-sm uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded shadow-sm border border-[#C06A35]/20 overflow-hidden">
          {/* Controls Bar: Search & Sort */}
          <div className="p-4 border-b border-[#C06A35]/20 bg-[#FDF6F0]/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Buscar por nome, marca ou categoria..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#C06A35]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex border border-gray-300 bg-white p-1 text-xs">
                <button type="button" onClick={() => setInventoryScope('active')} className={`px-3 py-1.5 ${inventoryScope === 'active' ? 'bg-[#1A332B] text-white' : ''}`}>Ativos</button>
                <button type="button" onClick={() => setInventoryScope('archived')} className={`px-3 py-1.5 ${inventoryScope === 'archived' ? 'bg-[#1A332B] text-white' : ''}`}>Arquivados</button>
              </div>
              <label htmlFor="inventory-sort" className="text-xs font-semibold uppercase tracking-wider text-[#423226]">Ordenar por:</label>
              <select
                id="inventory-sort"
                value={inventorySort}
                onChange={e => setInventorySort(e.target.value)}
                className="border border-gray-300 rounded text-sm px-3 py-2 bg-white focus:outline-none focus:border-[#C06A35]"
              >
                <option value="newest">Mais recentes</option>
                <option value="name_asc">Nome (A-Z)</option>
                <option value="name_desc">Nome (Z-A)</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="stock_asc">Menor Estoque</option>
              </select>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} columns={6} label="Carregando estoque" />
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum produto encontrado.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FDF6F0] border-b border-[#C06A35]/20 text-[#1A332B] font-medium text-sm">
                      <th className="p-4">Produto</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preço</th>
                      <th className="p-4">Estoque</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(product => (
                      <tr key={product.id} className="border-b border-[#C06A35]/10 hover:bg-[#FDF6F0]/50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded border border-gray-200" />
                          <div>
                            <span className="font-serif font-bold text-[#1A332B] block">{product.name}</span>
                            {product.brand && <span className="text-xs text-gray-500">{product.brand}</span>}
                            {product.sku && <span className="block font-mono text-[10px] text-gray-400">{product.sku}</span>}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#423226]">{product.category}</td>
                        <td className="p-4 text-sm font-semibold text-[#1A332B]">
                          R$ {product.price.toFixed(2).replace('.', ',')}
                          {product.acquisitionCost !== undefined && (
                            <span className="block text-[10px] font-normal text-gray-500">
                              Margem bruta: {product.price > 0 ? (((product.price - product.acquisitionCost) / product.price) * 100).toFixed(0) : 0}%
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${product.stockQuantity === 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {product.stockQuantity ?? 1} un
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.isSold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {product.isSold ? 'Vendido' : 'Disponível'}
                          </span>
                        </td>
                        <td className="p-4 text-sm space-x-3">
                          {product.archivedAt ? (
                            <button onClick={() => handleRestore(product.id)} className="text-green-700 hover:underline">Restaurar</button>
                          ) : (
                            <>
                              <button onClick={() => { setEditingProduct(product); setIsEditing(true); }} className="text-blue-600 hover:underline">Editar</button>
                              <button onClick={() => openInventoryAdjustment(product)} className="text-orange-800 hover:underline">Ajustar estoque</button>
                              <button onClick={() => handleArchive(product.id)} className="text-red-600 hover:underline">Arquivar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalInventoryPages > 1 && (
                <div className="p-4 border-t border-[#C06A35]/20 flex justify-between items-center bg-[#FDF6F0]/30 text-sm">
                  <span className="text-xs text-gray-500">
                    Mostrando {(inventoryPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(inventoryPage * ITEMS_PER_PAGE, filteredAndSortedProducts.length)} de {filteredAndSortedProducts.length} produtos
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={inventoryPage === 1}
                      onClick={() => setInventoryPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1 border border-gray-300 rounded bg-white text-xs disabled:opacity-50 hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-xs font-semibold text-[#1A332B] flex items-center">
                      {inventoryPage} / {totalInventoryPages}
                    </span>
                    <button
                      disabled={inventoryPage === totalInventoryPages}
                      onClick={() => setInventoryPage(prev => Math.min(prev + 1, totalInventoryPages))}
                      className="px-3 py-1 border border-gray-300 rounded bg-white text-xs disabled:opacity-50 hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="inventory-adjustment-title">
          <form onSubmit={handleInventoryAdjustment} className="w-full max-w-lg border border-[#EAD8CC] bg-white p-6 shadow-xl">
            <h3 id="inventory-adjustment-title" className="font-serif text-2xl text-[#1A332B]">Ajustar estoque</h3>
            <p className="mt-1 text-sm text-gray-600">{adjustingProduct.name} · atual: {adjustingProduct.stockQuantity ?? 0}</p>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider">Nova quantidade
                <input required min="0" type="number" value={adjustmentQuantity} onChange={event => setAdjustmentQuantity(Math.max(0, Number(event.target.value)))} className="mt-1 w-full border p-3 text-base font-normal" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">Motivo
                <select required value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} className="mt-1 w-full border p-3 text-sm font-normal normal-case">
                  <option value="physical_count">Contagem física</option>
                  <option value="acquisition">Nova aquisição</option>
                  <option value="manual_correction">Correção de cadastro</option>
                  <option value="damage_or_loss">Avaria ou perda</option>
                  <option value="customer_return">Devolução do cliente</option>
                  <option value="order_cancellation">Cancelamento de pedido</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">Observação opcional
                <textarea maxLength={500} rows={3} value={adjustmentNote} onChange={event => setAdjustmentNote(event.target.value)} className="mt-1 w-full border p-3 text-sm font-normal normal-case" placeholder="Explique o ajuste quando necessário" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={savingAdjustment} onClick={() => setAdjustingProduct(null)} className="border px-5 py-2 text-xs font-bold uppercase">Cancelar</button>
              <button type="submit" disabled={savingAdjustment} className="bg-[#1A332B] px-5 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">{savingAdjustment ? 'Salvando...' : 'Confirmar ajuste'}</button>
            </div>
          </form>
        </div>
      )}

      {showMovementHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="inventory-history-title">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden border border-[#EAD8CC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div><h3 id="inventory-history-title" className="font-serif text-2xl text-[#1A332B]">Histórico de estoque</h3><p className="text-xs text-gray-500">Últimas 100 movimentações</p></div>
              <button type="button" onClick={() => setShowMovementHistory(false)} className="p-2 text-xl" aria-label="Fechar histórico">×</button>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              {loadingMovements ? <p className="p-8 text-center text-sm">Carregando movimentações...</p> : inventoryMovements.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Nenhuma movimentação registrada.</p> : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#FDF6F0]"><tr><th className="p-3">Data</th><th className="p-3">Produto</th><th className="p-3">Alteração</th><th className="p-3">Motivo</th><th className="p-3">Responsável</th></tr></thead>
                  <tbody>{inventoryMovements.map(movement => (
                    <tr key={movement.id} className="border-t align-top">
                      <td className="p-3 whitespace-nowrap text-xs">{new Date(movement.created_at).toLocaleString('pt-BR')}</td>
                      <td className="p-3"><strong>{movement.product_name}</strong>{movement.sku && <span className="block font-mono text-[10px] text-gray-500">{movement.sku}</span>}</td>
                      <td className="p-3 font-semibold">{movement.previous_quantity} → {movement.new_quantity} <span className={movement.delta > 0 ? 'text-green-700' : 'text-red-700'}>({movement.delta > 0 ? '+' : ''}{movement.delta})</span></td>
                      <td className="p-3">{movement.reason}{movement.note && <span className="block text-xs text-gray-500">{movement.note}</span>}</td>
                      <td className="p-3 text-xs">{movement.changed_by_email || 'sistema'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
