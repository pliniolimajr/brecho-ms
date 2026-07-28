/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const hasSecondaryImage = product.gallery && product.gallery.length > 0 && product.gallery[0];

  return (
    <div 
      className="group flex flex-col gap-3 cursor-pointer select-none" 
      onClick={() => onClick(product)}
      id={`product-card-${product.id}`}
    >
      <div className="relative w-full aspect-[5/7] overflow-hidden bg-[#F4E4D4] rounded-sm">
        {/* Main Product Image */}
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105 ${
            hasSecondaryImage ? 'group-hover:opacity-0' : ''
          }`}
        />
        
        {/* Secondary Gallery Image (Hover effect) */}
        {hasSecondaryImage && (
          <img 
            src={product.gallery![0]} 
            alt={`${product.name} - Vista alternativa`} 
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 ease-in-out group-hover:scale-105"
          />
        )}
        
        {/* Sold Badge */}
        {product.isSold && (
          <div className="absolute top-3 left-3 bg-[#1A332B]/90 text-[#FDF6F0] text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
            Esgotado
          </div>
        )}

        {/* Wishlist bookmark outline on top right */}
        <div className="absolute top-3 right-3 text-[#1A332B] hover:text-[#C06A35] transition-colors p-2 rounded-full bg-white/80 backdrop-blur-sm opacity-80 group-hover:opacity-100 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        </div>
      </div>
      
      {/* Product Details */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex justify-between items-center text-[10px] font-medium text-[#A8A29E] uppercase tracking-widest">
          <span>{product.category}</span>
          {product.brand && <span>{product.brand}</span>}
        </div>

        <h3 className="text-xs uppercase tracking-widest text-[#1A332B] font-semibold line-clamp-1 group-hover:text-[#C06A35] transition-colors">
          {product.name}
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