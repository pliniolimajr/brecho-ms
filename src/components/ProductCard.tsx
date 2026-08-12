/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { Product } from '../types';
import { WishlistButton } from './WishlistButton';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const hasSecondaryImage = product.gallery && product.gallery.length > 0 && product.gallery[0];
  const { comparison, toggleComparison } = useStore();
  const { showToast } = useToast();
  const isCompared = comparison.some(item => item.id === product.id);

  const handleComparison = (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = toggleComparison(product);
    if (result === 'limit') showToast('Você pode comparar no máximo três produtos.', 'error');
  };

  return (
    <div 
      className="group flex flex-col gap-3 select-none"
      id={`product-card-${product.id}`}
    >
      <div className="relative w-full aspect-[5/7] overflow-hidden bg-[#F4E4D4] rounded-sm">
        <button
          type="button"
          onClick={() => onClick(product)}
          aria-label={`Ver detalhes de ${product.name}`}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer text-left"
        >
          {/* Main Product Image */}
          <img
            src={product.imageUrl}
            alt=""
            width="500"
            height="700"
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105 ${hasSecondaryImage ? 'group-hover:opacity-0' : ''}`}
          />

          {/* Secondary Gallery Image (Hover effect) */}
          {hasSecondaryImage && (
            <img
              src={product.gallery![0]}
              alt=""
              width="500"
              height="700"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-in-out group-hover:scale-105 group-hover:opacity-100"
            />
          )}
        </button>
        
        {/* Sold Badge */}
        {product.isSold && (
          <div className="pointer-events-none absolute top-3 left-3 z-10 bg-[#1A332B]/90 text-[#FDF6F0] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
            Esgotado
          </div>
        )}

        {/* Wishlist bookmark — desktop e mobile */}
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton
            productId={product.id}
            className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-[#1A332B] hover:text-[#C06A35] opacity-80 group-hover:opacity-100"
          />
        </div>

        <button
          type="button"
          aria-pressed={isCompared}
          onClick={handleComparison}
          className={`absolute left-3 bottom-3 z-20 min-h-9 rounded px-3 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors ${isCompared ? 'bg-[#C06A35] text-white' : 'bg-white/90 text-[#1A332B] hover:bg-[#1A332B] hover:text-white'}`}
        >
          {isCompared ? 'Comparando' : 'Comparar'}
        </button>
      </div>
      
      {/* Product Details */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex justify-between items-center text-[10px] font-medium text-[#6B625C] uppercase tracking-widest">
          <span>{product.category}</span>
          {product.brand && <span>{product.brand}</span>}
        </div>

        <h3 className="text-xs uppercase tracking-widest text-[#1A332B] font-semibold line-clamp-1 group-hover:text-[#C06A35] transition-colors">
          <button type="button" onClick={() => onClick(product)} className="text-left hover:underline underline-offset-4">
            {product.name}
          </button>
        </h3>

        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-bold text-[#1A332B]">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>

          <div className="text-[#1A332B] hover:text-[#C06A35] transition-colors p-1" title="Ver detalhes">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 15.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
