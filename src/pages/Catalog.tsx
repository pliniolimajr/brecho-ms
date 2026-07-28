import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CATEGORIES = ['Todos', 'Vestidos', 'Calças', 'Saias', 'Camisetas', 'Casacos', 'Acessórios', 'Calçados', 'Outros'];
const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'ÚNICO', '34', '36', '38', '40', '42', '44', '46', '48'];

export function Catalog() {
  const { products, isLoadingProducts } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState<string>('Todos');
  const [size, setSize] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortOrder, setSortOrder] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');

  const [selectedBrand, setSelectedBrand] = useState('Todos');
  const [selectedColor, setSelectedColor] = useState('Todos');
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');

  useEffect(() => {
    document.title = 'Coleção & Catálogo | Palm CO.';
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const uniqueBrands = useMemo(() => {
    const list = products.map(p => p.brand).filter(Boolean) as string[];
    return ['Todos', ...Array.from(new Set(list))];
  }, [products]);

  const uniqueColors = useMemo(() => {
    const list = products.flatMap(p => p.color || []).filter(Boolean) as string[];
    return ['Todos', ...Array.from(new Set(list))];
  }, [products]);

  const uniqueMaterials = useMemo(() => {
    const list = products.map(p => p.material).filter(Boolean) as string[];
    return ['Todos', ...Array.from(new Set(list))];
  }, [products]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategory('Todos');
    setSize('');
    setMinPrice(0);
    setMaxPrice(1000);
    setSelectedBrand('Todos');
    setSelectedColor('Todos');
    setSelectedMaterial('Todos');
    setSearchParams({});
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      category !== 'Todos' ||
      size !== '' ||
      minPrice > 0 ||
      maxPrice < 1000 ||
      selectedBrand !== 'Todos' ||
      selectedColor !== 'Todos' ||
      selectedMaterial !== 'Todos' ||
      !!searchParams.get('filter')
    );
  }, [searchQuery, category, size, minPrice, maxPrice, selectedBrand, selectedColor, selectedMaterial, searchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.material?.toLowerCase().includes(q)
      );
    }

    if (category !== 'Todos') {
      result = result.filter(p => p.category === category);
    }

    if (size) {
      result = result.filter(p => p.size === size);
    }

    if (selectedBrand !== 'Todos') {
      result = result.filter(p => p.brand === selectedBrand);
    }

    if (selectedColor !== 'Todos') {
      result = result.filter(p => p.color?.includes(selectedColor));
    }

    if (selectedMaterial !== 'Todos') {
      result = result.filter(p => p.material === selectedMaterial);
    }

    result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);

    // Filter type (e.g., promo/outlet if passed in search query)
    const filterType = searchParams.get('filter');
    if (filterType === 'sale') {
      result = result.filter(p => p.price <= 50 || p.tagline?.toLowerCase().includes('promo') || p.name.toLowerCase().includes('promo'));
    } else if (filterType === 'outlet') {
      result = result.filter(p => p.price <= 35);
    }

    if (sortOrder === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, category, size, minPrice, maxPrice, sortOrder, searchQuery, selectedBrand, selectedColor, selectedMaterial, searchParams]);

  return (
    <div className="min-h-screen pt-24 pb-24 bg-[#FDF6F0]">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12">

        <h1 className="text-4xl md:text-5xl font-serif text-[#1A332B] mb-3">Coleção & Curadoria</h1>
        <p className="text-[#423226] mb-8 max-w-2xl text-sm md:text-base leading-relaxed">
          Peças atemporais selecionadas com olhar criterioso. Explore nosso catálogo por categoria, tamanho, cor ou tecido.
        </p>

        {/* Search & Sort Header Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 max-w-4xl">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, tecido, cor ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="catalog-search-input"
              className="w-full bg-white border border-[#C06A35]/30 py-3 pl-4 pr-12 text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors rounded-sm text-sm"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3 text-[#A8A29E] hover:text-[#1A332B] font-bold text-sm"
                title="Limpar busca"
              >
                &times;
              </button>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute right-4 top-3.5 text-[#A8A29E]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            )}
          </div>
          <div className="w-full md:w-56 flex-shrink-0 relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              id="catalog-sort-select"
              className="w-full bg-white border border-[#C06A35]/30 py-3 px-4 text-[#1A332B] outline-none focus:border-[#1A332B] transition-colors appearance-none cursor-pointer pr-10 rounded-sm text-sm"
            >
              <option value="recent">Mais Recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#A8A29E]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-8 bg-white p-3 rounded border border-[#C06A35]/20 text-xs">
            <span className="font-semibold text-[#A8A29E] uppercase tracking-wider text-[10px]">Filtros Ativos:</span>
            {searchQuery && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Busca: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {category !== 'Todos' && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Categoria: {category}
                <button onClick={() => setCategory('Todos')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {size && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Tamanho: {size}
                <button onClick={() => setSize('')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {selectedBrand !== 'Todos' && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Marca: {selectedBrand}
                <button onClick={() => setSelectedBrand('Todos')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {selectedColor !== 'Todos' && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Cor: {selectedColor}
                <button onClick={() => setSelectedColor('Todos')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {selectedMaterial !== 'Todos' && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Material: {selectedMaterial}
                <button onClick={() => setSelectedMaterial('Todos')} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {minPrice > 0 && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                A partir de R$ {minPrice}
                <button onClick={() => setMinPrice(0)} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            {maxPrice < 1000 && (
              <span className="bg-[#FDF6F0] text-[#1A332B] border border-[#C06A35]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                Até R$ {maxPrice}
                <button onClick={() => setMaxPrice(1000)} className="font-bold hover:text-[#C06A35]">&times;</button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="text-[#C06A35] underline hover:text-[#1A332B] font-medium ml-auto text-xs"
            >
              Limpar Todos
            </button>
          </div>
        )}

        <div className="md:hidden mb-6">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full bg-[#1A332B] text-white py-3 uppercase tracking-widest text-sm font-medium flex items-center justify-center gap-2 rounded-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            {showMobileFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-start">

          {/* Sidebar - Filtros */}
          <aside className={`w-full md:w-64 flex-shrink-0 space-y-8 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
            <div>
              <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">Categorias</h3>
              <ul className="space-y-1.5">
                {CATEGORIES.map(cat => (
                  <li key={cat}>
                    <button
                      onClick={() => setCategory(cat)}
                      className={`text-sm text-left w-full transition-colors ${category === cat ? 'font-bold text-[#C06A35]' : 'text-[#423226] hover:text-[#1A332B]'}`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">Tamanho</h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSize('')}
                  className={`px-3 py-1 text-xs border rounded-sm transition-colors ${!size ? 'bg-[#1A332B] text-white border-[#1A332B]' : 'border-[#C06A35]/40 text-[#423226] hover:border-[#1A332B]'}`}
                >
                  Todos
                </button>
                {SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 text-xs border rounded-sm transition-colors ${size === s ? 'bg-[#1A332B] text-white border-[#1A332B]' : 'border-[#C06A35]/40 text-[#423226] hover:border-[#1A332B]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {uniqueBrands.length > 1 && (
              <div>
                <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">Marca</h3>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueBrands.map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBrand(b)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${selectedBrand === b ? 'bg-[#1A332B] text-white border-[#1A332B]' : 'border-[#C06A35]/40 text-[#423226] hover:border-[#1A332B]'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uniqueColors.length > 1 && (
              <div>
                <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">Cor</h3>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${selectedColor === c ? 'bg-[#1A332B] text-white border-[#1A332B]' : 'border-[#C06A35]/40 text-[#423226] hover:border-[#1A332B]'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uniqueMaterials.length > 1 && (
              <div>
                <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">Material</h3>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueMaterials.map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMaterial(m)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${selectedMaterial === m ? 'bg-[#1A332B] text-white border-[#1A332B]' : 'border-[#C06A35]/40 text-[#423226] hover:border-[#1A332B]'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-serif text-lg text-[#1A332B] mb-3 border-b border-[#C06A35]/30 pb-2">
                Faixa de Preço (R$)
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-[#A8A29E] block mb-1">Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    max={maxPrice}
                    placeholder="0"
                    value={minPrice || ''}
                    onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-[#C06A35]/30 p-2 text-xs text-[#1A332B] outline-none focus:border-[#1A332B] rounded-sm"
                  />
                </div>
                <span className="text-[#A8A29E] font-medium pt-4">-</span>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-[#A8A29E] block mb-1">Máximo</label>
                  <input
                    type="number"
                    min={minPrice}
                    placeholder="1000"
                    value={maxPrice === 1000 ? '' : maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value) || 1000)}
                    className="w-full bg-white border border-[#C06A35]/30 p-2 text-xs text-[#1A332B] outline-none focus:border-[#1A332B] rounded-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[#A8A29E] block">Ajuste rápido preço máx: R$ {maxPrice}</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#1A332B] cursor-pointer"
                />
              </div>
            </div>

          </aside>

          {/* Product Grid & States */}
          <main className="flex-1 w-full">
            <header className="mb-6 flex justify-between items-end">
              <h2 className="text-2xl font-serif text-[#1A332B]">{category === 'Todos' ? 'Todas as Peças' : category}</h2>
              <p className="text-xs text-[#A8A29E] font-medium">{filteredProducts.length} peça(s) encontrada(s)</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {isLoadingProducts ? (
                <div className="col-span-full py-24 text-center">
                  <div className="w-8 h-8 border-4 border-[#C06A35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs uppercase tracking-widest text-[#423226]">Carregando acervo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white p-8 rounded border border-[#C06A35]/20">
                  <div className="w-12 h-12 bg-[#C06A35]/10 rounded-full flex items-center justify-center text-[#C06A35] mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-serif text-[#1A332B] mb-2">Nenhuma peça encontrada</h3>
                  <p className="text-sm text-[#423226] max-w-md mx-auto mb-6">
                    Não encontramos produtos correspondentes aos filtros aplicados. Tente ajustar os parâmetros ou busque por termos mais genéricos.
                  </p>
                  <button
                    onClick={resetAllFilters}
                    className="px-6 py-2.5 bg-[#1A332B] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C06A35] transition-colors"
                  >
                    Ver Todas as Peças
                  </button>
                </div>
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

export default Catalog;
