import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Todos', 'Vestidos', 'Calças', 'Saias', 'Camisetas', 'Casacos', 'Acessórios', 'Calçados', 'Outros'];
const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'ÚNICO'];

export function Catalog() {
  const { products, isLoadingProducts } = useStore();
  const navigate = useNavigate();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [category, setCategory] = useState<string>('Todos');
  const [size, setSize] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortOrder, setSortOrder] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (category !== 'Todos') {
      result = result.filter(p => p.category === category);
    }
    
    if (size) {
      result = result.filter(p => p.size === size);
    }
    
    result = result.filter(p => p.price <= maxPrice);

    if (sortOrder === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    }
    // 'recent' uses the default order from DB (already sorted by created_at desc in store if we did that, 
    // or just array order)

    return result;
  }, [products, category, size, maxPrice, sortOrder]);

  return (
    <div className="min-h-screen pt-24 pb-24 bg-[#FDF6F0]">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12">
        
        <h1 className="text-4xl md:text-5xl font-serif text-[#1A332B] mb-4">Catálogo Completo</h1>
        <p className="text-[#423226] mb-12">Filtre por tamanho, preço e categoria para encontrar seu próximo garimpo.</p>

        <div className="md:hidden mb-6">
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full bg-[#1A332B] text-white py-3 uppercase tracking-widest text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            {showMobileFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-start">
          
          {/* Sidebar - Filtros */}
          <aside className={`w-full md:w-64 flex-shrink-0 space-y-10 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
            <div>
              <h3 className="font-serif text-xl text-[#1A332B] mb-4 border-b border-[#C06A35]/30 pb-2">Categorias</h3>
              <ul className="space-y-2">
                {CATEGORIES.map(cat => (
                  <li key={cat}>
                    <button 
                      onClick={() => setCategory(cat)}
                      className={`text-sm ${category === cat ? 'font-bold text-[#C06A35]' : 'text-[#423226] hover:text-[#1A332B]'}`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-serif text-xl text-[#1A332B] mb-4 border-b border-[#C06A35]/30 pb-2">Tamanho</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSize('')}
                  className={`px-3 py-1 text-xs border ${!size ? 'bg-[#1A332B] text-white' : 'border-[#C06A35]/50 text-[#423226]'}`}
                >
                  Todos
                </button>
                {SIZES.map(s => (
                  <button 
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 text-xs border ${size === s ? 'bg-[#1A332B] text-white' : 'border-[#C06A35]/50 text-[#423226] hover:border-[#1A332B]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

          <div>
            <h3 className="font-serif text-xl text-[#1A332B] mb-4 border-b border-[#C06A35]/30 pb-2">Preço Máximo: R$ {maxPrice}</h3>
            <input 
              type="range" 
              min="10" 
              max="1000" 
              step="10" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#1A332B]"
            />
          </div>
          
          <div>
            <h3 className="font-serif text-xl text-[#1A332B] mb-4 border-b border-[#C06A35]/30 pb-2">Ordenar por</h3>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full bg-transparent border border-[#C06A35]/50 p-2 text-[#423226] outline-none focus:border-[#1A332B]"
            >
              <option value="recent">Mais Recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          <header className="mb-8 flex justify-between items-end">
            <h1 className="text-4xl font-serif text-[#1A332B]">{category === 'Todos' ? 'Catálogo Completo' : category}</h1>
            <p className="text-sm text-[#A8A29E]">{filteredProducts.length} peças encontradas</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {isLoadingProducts ? (
              <div className="col-span-full py-20 text-center text-[#423226]">Carregando catálogo...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-[#423226]">Nenhuma peça corresponde aos filtros aplicados.</div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onClick={(p) => navigate(`/produto/${p.id}`)} 
                />
              ))
            )}
          </div>
        </main>
        </div>

      </div>
    </div>
  );
}
