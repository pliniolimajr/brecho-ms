import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useStore();
  const { showToast } = useToast();
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (product) {
      setActiveImage(product.imageUrl);
    }
  }, [product]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const images = [product.imageUrl, ...(product.gallery || [])].filter(Boolean) as string[];

  const handleAddToCart = () => {
    addToCart(product);
    showToast(`"${product.name}" adicionado ao carrinho!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop clickable */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#FDF6F0] rounded shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] z-10 animate-scale-up border border-[#C06A35]/25">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1A332B] hover:text-[#C06A35] z-20 transition-colors p-2 bg-[#FDF6F0]/80 rounded-full backdrop-blur-sm"
          title="Fechar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Column 1: Image Gallery */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-center bg-white">
          <div className="aspect-[4/5] w-full overflow-hidden bg-[#FDF6F0] rounded-sm relative flex items-center justify-center">
            <img 
              src={activeImage} 
              alt={product.name} 
              className="w-full h-full object-cover max-h-[400px] md:max-h-[500px]"
            />
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-14 h-18 flex-shrink-0 border rounded-sm overflow-hidden transition-all ${activeImage === img ? 'border-[#1A332B] ring-1 ring-[#1A332B]' : 'border-[#C06A35]/20 hover:border-[#1A332B]'}`}
                >
                  <img src={img} alt={`${product.name} thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Details */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center text-[10px] font-medium text-[#A8A29E] uppercase tracking-widest">
              <span>{product.category}</span>
              {product.brand && <span>{product.brand}</span>}
            </div>

            <div>
              <h2 className="text-2xl font-serif text-[#1A332B] mb-2">{product.name}</h2>
              {product.tagline && (
                <p className="text-xs italic text-[#C06A35] font-medium">{product.tagline}</p>
              )}
            </div>

            <div className="text-xl font-serif text-[#1A332B] font-bold">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </div>

            <div className="border-t border-[#C06A35]/20 pt-4 space-y-4">
              <p className="text-sm text-[#423226] leading-relaxed line-clamp-4">
                {product.description}
              </p>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs bg-white/50 p-4 border border-[#C06A35]/15 rounded-sm">
                <div>
                  <span className="text-[#A8A29E] uppercase font-bold block text-[9px] tracking-wider">Tamanho</span>
                  <span className="text-[#1A332B] font-medium text-sm">{product.size}</span>
                </div>
                {product.material && (
                  <div>
                    <span className="text-[#A8A29E] uppercase font-bold block text-[9px] tracking-wider">Material</span>
                    <span className="text-[#1A332B] font-medium text-sm">{product.material}</span>
                  </div>
                )}
                {product.color && product.color.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-[#A8A29E] uppercase font-bold block text-[9px] tracking-wider">Cor(es)</span>
                    <span className="text-[#1A332B] font-medium text-sm">{product.color.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#C06A35]/20 mt-8">
            <button
              onClick={handleAddToCart}
              className="w-full py-4 bg-[#1A332B] hover:bg-[#433E38] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 15.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Comprar Agora
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
