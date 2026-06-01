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
  return (
    <div className="group flex flex-col gap-6 cursor-pointer" onClick={() => onClick(product)}>
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#F4E4D4]">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110 sepia-[0.1]"
        />
        
        {/* Hover overlay with "Quick View" - minimalistic */}
        <div className="absolute inset-0 bg-[#1A332B]/0 group-hover:bg-[#1A332B]/5 transition-colors duration-500 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                <span className="bg-white/90 backdrop-blur text-[#1A332B] px-6 py-3 rounded-full text-xs uppercase tracking-widest font-medium">
                    View Details
                </span>
            </div>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-2xl font-serif font-medium text-[#1A332B] mb-1 group-hover:opacity-70 transition-opacity">{product.name}</h3>
        <p className="text-sm font-light text-[#423226] mb-3 tracking-wide">{product.category}</p>
        <span className="text-sm font-medium text-[#1A332B] block">R$ {product.price.toFixed(2).replace('.', ',')}</span>
      </div>
    </div>
  );
};

export default ProductCard;