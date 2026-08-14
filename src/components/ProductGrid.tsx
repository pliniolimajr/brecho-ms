/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Product } from '../types';
import ProductCard from './ProductCard';
import { useNavigate } from 'react-router-dom';

interface ProductGridProps {
  onProductClick: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ onProductClick }) => {
  const { products, isLoadingProducts } = useStore();
  const navigate = useNavigate();
  const recentProducts = useMemo(() => {
    return products.slice(0, 6);
  }, [products]);

  return (
    <section id="products" className="palm-section bg-[#FDF6F0]">
      <div className="palm-shell">
        <header className="mb-14 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <span className="palm-eyebrow mb-4 block">Seleção recente</span>
            <h2 className="palm-display mb-6 text-4xl md:text-6xl">Recém-chegadas</h2>
            <p className="max-w-xl text-base leading-relaxed text-[#423226] md:text-lg">
              Peças escolhidas uma a uma, com atenção à presença, à versatilidade e aos detalhes que permanecem.
            </p>
          </div>
          <p className="hidden max-w-xs text-right text-xs uppercase leading-relaxed tracking-[0.16em] text-[#6B625C] md:block">
            Edições limitadas.<br />Quando uma peça vai, ela não se repete.
          </p>
        </header>

        {/* Large Grid */}
        <div className="grid grid-cols-1 gap-x-7 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-24">
          {isLoadingProducts ? (
            <div className="col-span-full py-20 text-center text-[#423226]">Carregando produtos...</div>
          ) : recentProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-[#423226]">A loja está vazia no momento.</div>
          ) : (
            recentProducts.map(product => (
              <ProductCard key={product.id} product={product} onClick={onProductClick} />
            ))
          )}
        </div>

        <div className="mt-16 flex justify-center md:mt-24">
          <button 
            onClick={() => navigate('/catalogo')}
            className="group inline-flex min-h-12 items-center gap-4 border-b border-[#1A332B] px-1 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A332B] transition-colors hover:border-[#C06A35] hover:text-[#8A4825]"
          >
            Ver catálogo completo
            <span aria-hidden="true" className="text-base transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
