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
    <section id="products" className="py-32 px-6 md:px-12 bg-[#FDF6F0]">
      <div className="max-w-[1800px] mx-auto">
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif text-[#1A332B] mb-6">Últimos Garimpos</h2>
            <p className="text-lg text-[#423226]">
              Peças únicas que acabaram de chegar. Se apaixonou? Leva, porque só tem uma!
            </p>
          </div>
        </header>

        {/* Large Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-20">
          {isLoadingProducts ? (
            <div className="col-span-full py-20 text-center text-[#423226]">Carregando garimpos...</div>
          ) : recentProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-[#423226]">O brechó está vazio no momento.</div>
          ) : (
            recentProducts.map(product => (
              <ProductCard key={product.id} product={product} onClick={onProductClick} />
            ))
          )}
        </div>

        <div className="mt-20 text-center">
          <button 
            onClick={() => navigate('/catalogo')}
            className="inline-block border border-[#1A332B] text-[#1A332B] px-12 py-4 uppercase tracking-widest text-sm font-medium hover:bg-[#1A332B] hover:text-[#FDF6F0] transition-colors"
          >
            Ver Catálogo Completo
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;