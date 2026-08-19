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
  const { cart, comparison, addToCart, setIsCartOpen, toggleComparison } = useStore();
  const { showToast } = useToast();
  const isCompared = comparison.some(item => item.id === product.id);

  const handleComparison = (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = toggleComparison(product);
    if (result === 'limit') showToast('Você pode comparar no máximo três produtos.', 'error');
  };

  const handleBuy = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (product.isSold || product.stockQuantity === 0) return;
    if (cart.some(item => item.id === product.id)) {
      setIsCartOpen(true);
      showToast('Esta peça já está na sua sacola.', 'info');
      return;
    }
    addToCart(product);
  };

  return (
    <div 
      className="group flex flex-col gap-3 select-none"
      id={`product-card-${product.id}`}
    >
      <div className="palm-product-media aspect-[5/7] w-full rounded-sm">
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
            className={`palm-product-image transition-all duration-700 ease-in-out group-hover:scale-[1.025] ${hasSecondaryImage ? 'group-hover:opacity-0' : ''}`}
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
              className="palm-product-image absolute inset-0 opacity-0 transition-all duration-700 ease-in-out group-hover:scale-[1.025] group-hover:opacity-100"
            />
          )}
        </button>
        
        {/* Sold Badge */}
        {product.isSold && (
          <div className="pointer-events-none absolute left-3 top-14 z-10 rounded bg-[#1A332B]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FDF6F0]">
            Esgotado
          </div>
        )}

        {/* Wishlist bookmark — desktop e mobile */}
        <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <WishlistButton
            productId={product.id}
            className="h-11 w-11 rounded-full bg-white/90 p-0 leading-none text-[#1A332B] shadow-sm backdrop-blur-sm hover:text-[#8A4825]"
          />
        </div>

        <button
          type="button"
          aria-pressed={isCompared}
          onClick={handleComparison}
          className={`absolute left-3 top-3 z-20 min-h-9 border px-3 text-[9px] font-bold uppercase tracking-[0.16em] shadow-sm backdrop-blur-sm transition-all md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${isCompared ? 'border-[#8A4825] bg-[#8A4825] text-white md:opacity-100' : 'border-white/70 bg-white/75 text-[#1A332B] hover:border-[#1A332B] hover:bg-white'}`}
        >
          {isCompared ? 'Comparando' : 'Compare'}
        </button>

      </div>
      
      {/* Product Details */}
      <div className="flex flex-col gap-1.5 px-0.5 pt-1">
        <div className="palm-eyebrow flex items-center justify-between gap-3">
          <span>{product.category}</span>
          {product.brand && <span>{product.brand}</span>}
        </div>

        <h3 className="line-clamp-1 text-sm font-medium text-[#1A332B] transition-colors group-hover:text-[#8A4825]">
          <button type="button" onClick={() => onClick(product)} className="text-left underline-offset-4 hover:underline">
            {product.name}
          </button>
        </h3>

        <div className="mt-1 flex items-end justify-between gap-3 border-t border-[#C06A35]/15 pt-2.5">
          <span className="font-serif text-base text-[#1A332B]">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          {product.size && <span className="palm-eyebrow">Tam. {product.size}</span>}
        </div>

        {!product.isSold && product.stockQuantity !== 0 && (
          <button
            type="button"
            onClick={handleBuy}
            className="mt-2 min-h-11 w-full bg-[#1A332B] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#8A4825] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A332B]"
          >
            Adicionar à sacola
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
