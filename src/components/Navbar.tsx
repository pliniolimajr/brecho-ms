/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { BRAND_NAME } from '../constants';

import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavClick, cartCount, onOpenCart }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { session } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    setMobileMenuOpen(false);
    onNavClick(e, targetId);
  };

  const handleCartClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setMobileMenuOpen(false);
      onOpenCart();
  }

  // Determine text color based on state
  const isLightText = !scrolled && !mobileMenuOpen;
  const textColorClass = isLightText ? 'text-[#FDF6F0]' : 'text-[#1A332B]';
  const logoColorClass = isLightText ? 'text-[#FDF6F0]' : 'text-[#C06A35]';

  return (
    <>
      <div className="bg-[#C06A35] text-[#FDF6F0] text-center text-xs tracking-widest py-2 px-4 uppercase font-medium">
        Peças únicas e exclusivas. Reserve online, retire na nossa loja física.
      </div>
      <nav 
        className={`sticky top-0 z-50 transition-all duration-300 ease-in-out border-b ${
          scrolled ? 'bg-[#FDF6F0]/95 backdrop-blur-md py-4 border-[#C06A35]/20 shadow-sm' : 'bg-[#FDF6F0] py-6 border-transparent'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-8 flex items-center justify-between">
          {/* Logo */}
          <a 
            href="#" 
            onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                onNavClick(e, '');
            }}
            className={`text-3xl font-serif tracking-tight z-50 relative transition-colors duration-300 ${scrolled ? 'text-[#C06A35]' : 'text-[#1A332B]'}`}
          >
            {BRAND_NAME}
          </a>
          
          {/* Center Links - Desktop */}
          <div className={`hidden md:flex items-center gap-10 text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${scrolled ? 'text-[#1A332B]' : 'text-[#423226]'}`}>
            <a href="#products" onClick={(e) => handleLinkClick(e, 'products')} className="hover:text-[#C06A35] transition-colors relative group">
              Catálogo
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#C06A35] transition-all group-hover:w-full"></span>
            </a>
            <a href="#about" onClick={(e) => handleLinkClick(e, 'about')} className="hover:text-[#C06A35] transition-colors relative group">
              Nossa História
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#C06A35] transition-all group-hover:w-full"></span>
            </a>
            {session ? (
              <a href="/minha-conta" onClick={(e) => { e.preventDefault(); handleLinkClick(e, 'minha-conta'); window.location.href = '/minha-conta'; }} className="hover:text-[#C06A35] transition-colors relative group">
                {session.user?.user_metadata?.full_name 
                  ? `Olá, ${session.user.user_metadata.full_name.split(' ')[0]}`
                  : 'Minha Conta'}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#C06A35] transition-all group-hover:w-full"></span>
              </a>
            ) : (
              <a href="/login" onClick={(e) => { e.preventDefault(); handleLinkClick(e, 'login'); window.location.href = '/login'; }} className="hover:text-[#C06A35] transition-colors relative group">
                Login
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#C06A35] transition-all group-hover:w-full"></span>
              </a>
            )}
          </div>

          {/* Right Actions */}
          <div className={`flex items-center gap-6 z-50 relative transition-colors duration-300 ${scrolled ? 'text-[#1A332B]' : 'text-[#423226]'}`}>
            <button 
              onClick={handleCartClick}
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-[#C06A35] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="bg-[#1A332B] text-[#FDF6F0] group-hover:bg-[#C06A35] transition-colors px-2 py-0.5 rounded-full text-[10px]">
                {cartCount}
              </span>
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
              className={`block md:hidden focus:outline-none transition-colors duration-500 ${textColorClass}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
               {mobileMenuOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                 </svg>
               )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-[#FDF6F0] z-40 flex flex-col justify-center items-center transition-all duration-500 ease-in-out ${
          mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-10 pointer-events-none'
      }`}>
          <div className="flex flex-col items-center space-y-8 text-xl font-serif font-medium text-[#1A332B]">
            <a href="#products" onClick={(e) => handleLinkClick(e, 'products')} className="hover:opacity-60 transition-opacity">Loja</a>
            <a href="#about" onClick={(e) => handleLinkClick(e, 'about')} className="hover:opacity-60 transition-opacity">Sobre</a>
            {session ? (
              <a href="/minha-conta" onClick={(e) => { e.preventDefault(); handleLinkClick(e, 'minha-conta'); window.location.href = '/minha-conta'; }} className="hover:opacity-60 transition-opacity">Minha Conta</a>
            ) : (
              <a href="/login" onClick={(e) => { e.preventDefault(); handleLinkClick(e, 'login'); window.location.href = '/login'; }} className="hover:opacity-60 transition-opacity">Login</a>
            )}
            <button 
                onClick={handleCartClick} 
                className="hover:opacity-60 transition-opacity text-base uppercase tracking-widest font-sans mt-8"
            >
                Carrinho ({cartCount})
            </button>
          </div>
      </div>
    </>
  );
};

export default Navbar;