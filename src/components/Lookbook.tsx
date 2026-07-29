import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';
import type { Product } from '../types';

export const Lookbook: React.FC = () => {
  const { products, addToCart } = useStore();
  const { showToast } = useToast();

  // Look 1 (Urban) Items Selection
  const urbanItems = useMemo(() => {
    const list = products.filter(p => !p.isSold);
    const top = list.find(p => 
      p.category === 'Casacos' || 
      p.category === 'Camisetas' || 
      p.name.toLowerCase().includes('blazer') || 
      p.name.toLowerCase().includes('casaco')
    );
    const bottom = list.find(p => 
      p.id !== top?.id && 
      (p.category === 'Calças' || p.category === 'Saias')
    );
    
    if (top && bottom) return [top, bottom];
    return list.slice(0, 2);
  }, [products]);

  // Look 2 (Summer) Items Selection
  const summerItems = useMemo(() => {
    const list = products.filter(p => !p.isSold);
    const dress = list.find(p => p.category === 'Vestidos' || p.category === 'Outros');
    const accessory = list.find(p => p.id !== dress?.id && (p.category === 'Acessórios' || p.category === 'Calçados'));
    
    if (dress && accessory) return [dress, accessory];
    const usedIds = new Set(urbanItems.map(i => i.id));
    const available = list.filter(p => !usedIds.has(p.id));
    return available.slice(0, 2);
  }, [products, urbanItems]);

  // Checked states
  const [selectedUrbanIds, setSelectedUrbanIds] = useState<Set<string>>(new Set());
  const [selectedSummerIds, setSelectedSummerIds] = useState<Set<string>>(new Set());

  // Initialize selections once items are loaded
  React.useEffect(() => {
    if (urbanItems.length > 0) {
      setSelectedUrbanIds(new Set(urbanItems.map(i => i.id)));
    }
  }, [urbanItems]);

  React.useEffect(() => {
    if (summerItems.length > 0) {
      setSelectedSummerIds(new Set(summerItems.map(i => i.id)));
    }
  }, [summerItems]);

  const toggleUrbanSelection = (id: string) => {
    const next = new Set(selectedUrbanIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUrbanIds(next);
  };

  const toggleSummerSelection = (id: string) => {
    const next = new Set(selectedSummerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSummerIds(next);
  };

  const handleAddLookToCart = (items: Product[], selectedIds: Set<string>) => {
    const toAdd = items.filter(item => selectedIds.has(item.id));
    if (toAdd.length === 0) {
      showToast('Por favor, selecione pelo menos uma peça do look.', 'warning');
      return;
    }
    toAdd.forEach(item => addToCart(item));
    showToast(`${toAdd.length} peça(s) do look adicionada(s) ao carrinho!`, 'success');
  };

  if (products.length === 0) return null;

  return (
    <section className="py-32 bg-[#FAF6F0] px-6 md:px-12 border-t border-[#C06A35]/15">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-24 max-w-2xl mx-auto">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#C06A35]">Campanha Editorial</span>
          <h2 className="text-4xl md:text-5xl font-serif text-[#1A332B] mt-3 mb-6">Compre o Look</h2>
          <p className="text-sm md:text-base text-[#423226] leading-relaxed">
            Nossos estilistas combinaram peças exclusivas da coleção para criar visuais harmônicos e atemporais. Adicione a produção completa com um clique.
          </p>
        </div>

        {/* Editorial Looks Grid */}
        <div className="space-y-36">

          {/* Look 1: Minimalist Urban */}
          {urbanItems.length > 0 && (
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
              
              {/* Campaign Image */}
              <div className="w-full lg:w-1/2 aspect-[3/4] overflow-hidden bg-[#F4E4D4] rounded-sm shadow-lg relative group">
                <img 
                  src="/images/lookbook_editorial_urban.png" 
                  alt="Editorial Look Minimalist Urban" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#1A332B]/10 group-hover:bg-transparent transition-colors duration-500" />
              </div>

              {/* Look Details & Selection */}
              <div className="w-full lg:w-1/2 space-y-8">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C06A35]">Visual 01</span>
                  <h3 className="text-3xl font-serif text-[#1A332B] mt-2 mb-4">Minimalist Urban</h3>
                  <p className="text-sm text-[#423226] leading-relaxed">
                    Uma proposta contemporânea e estruturada. O casaco sobreposto cria linhas elegantes que alongam o visual, perfeitamente balanceado por calças de corte reto. Perfeito para transições do dia para a noite na cidade.
                  </p>
                </div>

                {/* Items Checklist */}
                <div className="space-y-4 border-t border-[#C06A35]/20 pt-6">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#A8A29E] mb-2">Peças do Visual</h4>
                  
                  {urbanItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => toggleUrbanSelection(item.id)}
                      className={`flex items-center justify-between p-4 border rounded cursor-pointer select-none transition-all duration-300 ${selectedUrbanIds.has(item.id) ? 'border-[#1A332B] bg-[#1A332B]/5' : 'border-[#C06A35]/20 hover:border-[#1A332B]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={selectedUrbanIds.has(item.id)}
                          onChange={() => {}} // Handled by outer click
                          className="accent-[#1A332B]"
                        />
                        <div className="w-12 h-16 bg-[#FDF6F0] rounded overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#1A332B] block">{item.name}</span>
                          <span className="text-[10px] text-[#A8A29E] uppercase tracking-widest">{item.category} • Tam {item.size}</span>
                        </div>
                      </div>
                      <span className="font-serif text-sm font-semibold text-[#1A332B]">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <button
                    onClick={() => handleAddLookToCart(urbanItems, selectedUrbanIds)}
                    className="w-full py-4 bg-[#1A332B] hover:bg-[#433E38] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    Adicionar Look Completo ao Carrinho
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Look 2: Summer Breeze */}
          {summerItems.length > 0 && (
            <div className="flex flex-col lg:flex-row-reverse gap-12 lg:gap-24 items-center">
              
              {/* Campaign Image */}
              <div className="w-full lg:w-1/2 aspect-[3/4] overflow-hidden bg-[#F4E4D4] rounded-sm shadow-lg relative group">
                <img 
                  src="/images/lookbook_editorial_summer.png" 
                  alt="Editorial Look Summer Breeze" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#1A332B]/10 group-hover:bg-transparent transition-colors duration-500" />
              </div>

              {/* Look Details & Selection */}
              <div className="w-full lg:w-1/2 space-y-8">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C06A35]">Visual 02</span>
                  <h3 className="text-3xl font-serif text-[#1A332B] mt-2 mb-4">Summer Breeze</h3>
                  <p className="text-sm text-[#423226] leading-relaxed">
                    Leveza e fluidez sob o sol de fim de tarde. Tecidos orgânicos naturais como linho trazem frescor e sofisticação discreta, complementados por acessórios selecionados de couro macio e design artesanal.
                  </p>
                </div>

                {/* Items Checklist */}
                <div className="space-y-4 border-t border-[#C06A35]/20 pt-6">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#A8A29E] mb-2">Peças do Visual</h4>
                  
                  {summerItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => toggleSummerSelection(item.id)}
                      className={`flex items-center justify-between p-4 border rounded cursor-pointer select-none transition-all duration-300 ${selectedSummerIds.has(item.id) ? 'border-[#1A332B] bg-[#1A332B]/5' : 'border-[#C06A35]/20 hover:border-[#1A332B]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={selectedSummerIds.has(item.id)}
                          onChange={() => {}} // Handled by outer click
                          className="accent-[#1A332B]"
                        />
                        <div className="w-12 h-16 bg-[#FDF6F0] rounded overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-wider font-semibold text-[#1A332B] block">{item.name}</span>
                          <span className="text-[10px] text-[#A8A29E] uppercase tracking-widest">{item.category} • Tam {item.size}</span>
                        </div>
                      </div>
                      <span className="font-serif text-sm font-semibold text-[#1A332B]">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <button
                    onClick={() => handleAddLookToCart(summerItems, selectedSummerIds)}
                    className="w-full py-4 bg-[#1A332B] hover:bg-[#433E38] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    Adicionar Look Completo ao Carrinho
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </section>
  );
};
