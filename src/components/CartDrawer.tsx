/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import type { Product } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: Product[];
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}



const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, onRemoveItem, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusBoundary = (edge: 'first' | 'last') => {
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-focus-guard])',
    ) ?? []);
    focusable[edge === 'first' ? 0 : focusable.length - 1]?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      opener?.focus();
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        ref={dialogRef}
        role="presentation"
        className={`fixed inset-0 bg-[#1A332B]/30 backdrop-blur-sm z-[60] transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-labelledby="cart-drawer-title"
        className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#FDF6F0] z-[70] shadow-2xl transform transition-transform duration-500 ease-in-out border-l border-[#C06A35] flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <span data-focus-guard tabIndex={0} onFocus={() => focusBoundary('last')} />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C06A35]/30 px-6 py-7">
          <div>
            <p className="palm-eyebrow mb-1">Sua seleção</p>
            <h2 id="cart-drawer-title" className="text-2xl font-serif text-[#1A332B]">Seu Carrinho ({items.length})</h2>
          </div>
          <button 
            ref={closeButtonRef}
            onClick={onClose} 
            className="text-[#A8A29E] hover:text-[#1A332B] transition-colors p-1"
            title="Fechar carrinho"
            aria-label="Fechar carrinho"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>



        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-[#A8A29E]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="font-serif text-xl text-[#1A332B]">Sua seleção está vazia.</p>
              <p className="max-w-xs text-sm leading-6 text-[#6B625C]">Explore a curadoria e guarde aqui as peças que deseja levar.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex gap-4 animate-fade-in-up border-b border-[#C06A35]/15 pb-7">
                <div className="palm-product-media aspect-[5/7] w-24 flex-shrink-0">
                  <img src={item.imageUrl} alt={item.name} className="palm-product-image" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-serif text-[#1A332B] text-base leading-5">{item.name}</h3>
                      <span className="text-[#1A332B] font-bold text-sm flex-shrink-0">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {item.brand && <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A4825]">{item.brand}</p>}
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-[#6B625C]">{item.category} {item.size ? `• Tam: ${item.size}` : ''}</p>
                  </div>
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    className="mt-2 self-start text-xs text-red-800 underline underline-offset-2 transition-colors hover:text-red-950"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#C06A35]/30 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium uppercase tracking-widest text-[#423226]">Subtotal</span>
            <span className="text-xl font-serif font-bold text-[#1A332B]">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
          <p className="mb-5 text-xs leading-5 text-[#6B625C]">Frete e prazo aparecem antes do pagamento. Você poderá revisar tudo antes de seguir para o Mercado Pago.</p>
          <button 
            onClick={onCheckout}
            disabled={items.length === 0}
            className="min-h-14 w-full bg-[#1A332B] px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[#FDF6F0] transition-colors hover:bg-[#8A4825] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finalizar Compra
          </button>
        </div>
        <span data-focus-guard tabIndex={0} onFocus={() => focusBoundary('first')} />
      </div>
    </>
  );
};

export default CartDrawer;
