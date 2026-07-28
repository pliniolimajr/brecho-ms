import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_NAME } from '../constants';

import { useAuth } from '../hooks/useAuth';
import { useStoreSettings } from '../hooks/useStoreSettings';

interface NavbarProps {
  onNavClick?: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavClick: _onNavClick, cartCount, onOpenCart }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { session } = useAuth();
  const { topBar } = useStoreSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onOpenCart();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchInput.trim())}`);
      setSearchOpen(false);
      setSearchInput('');
    }
  };

  return (
    <>
      {topBar.visible && (
        <div className="bg-[#C06A35] text-[#FDF6F0] text-center text-[10px] tracking-[0.25em] py-2.5 px-4 uppercase font-medium">
          {topBar.text}
        </div>
      )}
      <nav 
        className={`sticky top-0 z-50 transition-all duration-300 ease-in-out border-b ${
          scrolled ? 'bg-[#FDF6F0]/95 backdrop-blur-md py-4 border-[#C06A35]/20 shadow-sm' : 'bg-[#FDF6F0] py-6 border-transparent'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-8 w-full">
          <div className="grid grid-cols-3 items-center w-full relative">
            
            {/* Left: Nav links (Desktop) or Menu toggle (Mobile) */}
            <div className="flex items-center">
              <div className="hidden md:flex items-center gap-8 text-[11px] font-medium tracking-[0.15em] uppercase text-[#423226]">
                {/* 
                <a href="/catalogo?filter=sale" onClick={(e) => { e.preventDefault(); navigate('/catalogo?filter=sale'); }} className="text-[#A84A32] font-bold hover:opacity-75 transition-opacity">
                  Sale
                </a>
                <a href="/catalogo?filter=new" onClick={(e) => { e.preventDefault(); navigate('/catalogo?filter=new'); }} className="hover:text-[#C06A35] transition-colors">
                  Novo
                </a>
                */}
                <a href="/catalogo" onClick={(e) => { e.preventDefault(); navigate('/catalogo'); }} className="hover:text-[#C06A35] transition-colors">
                  Coleção
                </a>
                <a href="/sobre" onClick={(e) => { e.preventDefault(); navigate('/sobre'); }} className="hover:text-[#C06A35] transition-colors">
                  Sobre
                </a>
                {/* 
                <a href="/catalogo?filter=outlet" onClick={(e) => { e.preventDefault(); navigate('/catalogo?filter=outlet'); }} className="hover:text-[#C06A35] transition-colors">
                  Outlet
                </a>
                */}
              </div>
              
              {/* Mobile Menu Toggle */}
              <button 
                className="block md:hidden focus:outline-none text-[#1A332B] hover:opacity-70 transition-opacity"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
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

            {/* Center: Logo */}
            <div className="flex justify-center">
              <a 
                href="#" 
                onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    navigate('/');
                }}
                className="text-3xl font-serif tracking-wide text-[#1A332B] transition-opacity hover:opacity-75"
              >
                {BRAND_NAME}
              </a>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-6 text-[11px] font-medium tracking-[0.15em] uppercase text-[#423226]">
              {/* Search (Desktop & Mobile) */}
              <div className="relative flex items-center justify-end">
                {/* Desktop Inline Sliding Search Input */}
                <form 
                  onSubmit={handleSearchSubmit} 
                  className={`hidden md:flex items-center relative overflow-hidden transition-all duration-300 ease-out origin-right ${
                    searchOpen ? 'w-56 lg:w-72 opacity-100 mr-2' : 'w-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="O que você procura?"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white border border-[#C06A35]/30 px-3.5 py-1.5 text-xs text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] rounded-sm pr-7"
                    autoFocus={searchOpen}
                  />
                  {searchInput ? (
                    <button 
                      type="button" 
                      onClick={() => setSearchInput('')}
                      className="absolute right-2 text-[#A8A29E] hover:text-[#1A332B] font-bold text-xs"
                      title="Limpar"
                    >
                      &times;
                    </button>
                  ) : null}
                </form>

                {/* Search Toggle Icon - Keeps exact position */}
                <button 
                  onClick={() => {
                    if (searchOpen && searchInput.trim()) {
                      navigate(`/catalogo?search=${encodeURIComponent(searchInput.trim())}`);
                      setSearchOpen(false);
                      setSearchInput('');
                    } else {
                      setSearchOpen(!searchOpen);
                    }
                  }}
                  className="hover:text-[#C06A35] transition-colors flex items-center p-1"
                  aria-label="Buscar"
                  title={searchOpen ? "Pesquisar" : "Abrir busca"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                  </svg>
                </button>
              </div>

              {/* Account */}
              <a 
                href={session ? "/minha-conta" : "/login"} 
                onClick={(e) => { e.preventDefault(); navigate(session ? "/minha-conta" : "/login"); }}
                className="hidden md:block hover:text-[#C06A35] transition-colors"
              >
                Conta
              </a>

              {/* Wishlist */}
              <a 
                href="/minha-conta?tab=wishlist" 
                onClick={(e) => { e.preventDefault(); navigate("/minha-conta?tab=wishlist"); }}
                className="hidden md:block hover:text-[#C06A35] transition-colors"
              >
                Favoritos
              </a>

              {/* Sacola */}
              <button 
                onClick={handleCartClick}
                className="group flex items-center gap-2 hover:text-[#C06A35] transition-colors"
                aria-label="Sacola de compras"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <div className="bg-black text-[#FDF6F0] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-sans font-bold transition-colors group-hover:bg-[#C06A35]">
                  {cartCount}
                </div>
              </button>
            </div>
          </div>

          {/* Mobile search slide-down bar with smooth downward transition */}
          <div 
            className={`md:hidden overflow-hidden transition-all duration-300 ease-out origin-top ${
              searchOpen ? 'max-h-24 opacity-100 mt-4 pt-4 border-t border-[#C06A35]/15' : 'max-h-0 opacity-0 pointer-events-none mt-0 pt-0 border-t-0'
            }`}
          >
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
              <input
                type="text"
                placeholder="O que você procura?"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-white border border-[#C06A35]/30 px-3.5 py-2 text-xs uppercase tracking-wider text-[#1A332B] placeholder-[#A8A29E] outline-none focus:border-[#1A332B] transition-colors rounded-sm"
                autoFocus={searchOpen}
              />
              <button type="submit" className="bg-[#1A332B] text-[#FDF6F0] px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-[#C06A35] transition-colors rounded-sm">
                Buscar
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-[#FDF6F0] z-40 flex flex-col justify-center items-center transition-all duration-500 ease-in-out ${
          mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-10 pointer-events-none'
      }`}>
          <div className="flex flex-col items-center space-y-6 text-xl font-serif text-[#1A332B]">
            {/* 
            <a href="/catalogo?filter=sale" onClick={() => { setMobileMenuOpen(false); navigate('/catalogo?filter=sale'); }} className="text-[#A84A32] font-semibold hover:opacity-60 transition-opacity">Sale</a>
            <a href="/catalogo?filter=new" onClick={() => { setMobileMenuOpen(false); navigate('/catalogo?filter=new'); }} className="hover:opacity-60 transition-opacity">Novo</a>
            */}
            <a href="/catalogo" onClick={() => { setMobileMenuOpen(false); navigate('/catalogo'); }} className="hover:opacity-60 transition-opacity">Coleção</a>
            <a href="/sobre" onClick={() => { setMobileMenuOpen(false); navigate('/sobre'); }} className="hover:opacity-60 transition-opacity">Sobre</a>
            {/* 
            <a href="/catalogo?filter=outlet" onClick={() => { setMobileMenuOpen(false); navigate('/catalogo?filter=outlet'); }} className="hover:opacity-60 transition-opacity">Outlet</a>
            */}
            <hr className="w-16 border-t border-[#C06A35]/20 my-4" />
            <a href="/minha-conta" onClick={() => { setMobileMenuOpen(false); navigate('/minha-conta'); }} className="hover:opacity-60 transition-opacity">Minha Conta</a>
            <a href="/minha-conta?tab=wishlist" onClick={() => { setMobileMenuOpen(false); navigate('/minha-conta?tab=wishlist'); }} className="hover:opacity-60 transition-opacity">Favoritos</a>
            <button 
                onClick={handleCartClick} 
                className="hover:opacity-60 transition-opacity text-base uppercase tracking-widest font-sans mt-8"
            >
                Sacola ({cartCount})
            </button>
          </div>
      </div>
    </>
  );
};

export default Navbar;