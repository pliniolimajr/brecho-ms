import React, { useState } from 'react';
import type { Product } from '../types';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  
  // Como é um brechó, os tamanhos variam de peça para peça. 
  // No futuro, isso pode vir do `product.features`.
  const showSizes = false; 

  return (
    <div className="pt-24 min-h-screen bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 pb-24">
        
        {/* Breadcrumb / Back */}
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#1A332B] transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para a Loja
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Left: Main Image Only */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-[4/5] bg-[#F4E4D4] overflow-hidden relative">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover animate-fade-in-up"
              />
              <span className="absolute top-4 right-4 bg-[#FDF6F0] text-[#1A332B] text-xs font-bold uppercase tracking-widest px-3 py-1 shadow-md">
                Peça Única
              </span>
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-center max-w-xl">
             <span className="text-sm font-medium text-[#A8A29E] uppercase tracking-widest mb-2">{product.category}</span>
             <h1 className="text-4xl md:text-5xl font-serif text-[#1A332B] mb-4">{product.name}</h1>
             <span className="text-2xl font-medium text-[#1A332B]">R$ {product.price.toFixed(2).replace('.', ',')}</span>
             
             <p className="text-[#423226] leading-relaxed font-light text-lg mb-8 border-b border-[#C06A35] pb-8">
               {product.longDescription || product.description}
             </p>

             <div className="flex flex-col gap-4">
               <button 
                 onClick={() => onAddToCart(product)}
                 className="w-full py-5 bg-[#1A332B] text-[#FDF6F0] uppercase tracking-widest text-sm font-medium hover:bg-[#433E38] transition-colors"
               >
                 Colocar no Carrinho — R$ {product.price.toFixed(2).replace('.', ',')}
               </button>
               <ul className="mt-8 space-y-2 text-sm text-[#423226]">
                 {product.features.map((feature, idx) => (
                   <li key={idx} className="flex items-center gap-3">
                     <span className="w-1 h-1 bg-[#1A332B] rounded-full"></span>
                     {feature}
                   </li>
                 ))}
               </ul>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetail;