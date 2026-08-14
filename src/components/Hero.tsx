import React, { useState, useEffect } from 'react';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { useNavigate } from 'react-router-dom';

const HERO_SLIDES = [
  {
    id: 1,
    url: '/hero/slide_1.jpg',
    optimizedBase: '/hero/optimized/slide_1',
    title: 'Mulher em arquitetura mediterrânea',
  },
  {
    id: 2,
    url: '/hero/slide_2.jpg',
    optimizedBase: '/hero/optimized/slide_2',
    title: 'Textura de linho orgânico',
  },
  {
    id: 3,
    url: '/hero/slide_3.jpg',
    optimizedBase: '/hero/optimized/slide_3',
    title: 'Sombra de palmeiras na parede',
  },
  {
    id: 4,
    url: '/hero/slide_4.jpg',
    optimizedBase: '/hero/optimized/slide_4',
    title: 'Detalhe em couro artesanal',
  },
  {
    id: 5,
    url: '/hero/slide_5.jpg',
    optimizedBase: '/hero/optimized/slide_5',
    title: 'Casal em passeio urbano',
  },
];

const Hero: React.FC = () => {
  const { hero } = useStoreSettings();
  const navigate = useNavigate();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % HERO_SLIDES.length);
    }, 15000); // 15 segundos por imagem

    return () => clearInterval(timer);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      try {
        window.history.pushState(null, '', `#${targetId}`);
      } catch {
        // Ignore SecurityError in restricted environments
      }
    } else {
      navigate('/catalogo');
    }
  };

  return (
    <section className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-[#111111]" aria-label="Apresentação Palm CO.">

      {/* Background Slider Container */}
      <div className="absolute inset-0 w-full h-full">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 w-full h-full transition-opacity duration-2000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
            >
              <picture className="block w-full h-full">
                <source
                  type="image/avif"
                  srcSet={`${slide.optimizedBase}-640.avif 640w, ${slide.optimizedBase}-1024.avif 1024w`}
                  sizes="100vw"
                />
                <source
                  type="image/webp"
                  srcSet={`${slide.optimizedBase}-640.webp 640w, ${slide.optimizedBase}-1024.webp 1024w`}
                  sizes="100vw"
                />
                <img
                  src={slide.url}
                  alt={isActive ? slide.title : ''}
                  width="1024"
                  height="1024"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  decoding="async"
                  className={`w-full h-full object-cover object-center grayscale contrast-[0.9] brightness-[0.85] transition-transform duration-[15000ms] ease-out ${isActive ? 'scale-105' : 'scale-100'
                    }`}
                />
              </picture>
            </div>
          );
        })}

        {/* Dark Editorial Overlay ~50% */}
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        {/* Subtle Vignette for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40 z-10"></div>
      </div>

      {/* Hero Content Area */}
      <div className="relative z-20 mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-6 text-center">
        <div className="flex max-w-4xl flex-col items-center animate-fade-in-up">

          {/* Microtag: Editorial style with lines */}
          <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.3em] uppercase text-white/80 mb-6">
            <span className="w-8 h-[1px] bg-white/40"></span>
            <span>{hero.tagline || 'CURADORIA BAIANA'}</span>
            <span className="w-8 h-[1px] bg-white/40"></span>
          </div>

          {/* Title */}
          <h1 className="mb-6 font-serif text-[clamp(4rem,14vw,9rem)] font-normal leading-[0.88] tracking-[-0.055em] text-[#FDF6F0] drop-shadow-sm">
            {hero.title || 'Palm CO.'}
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base sm:text-lg md:text-xl text-white/85 font-light leading-relaxed mb-10 tracking-wide font-sans">
            {hero.subtitle || 'Uma curadoria de peças singulares para vestir com intenção, presença e liberdade.'}
          </p>

          {/* Buttons Area */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 w-full">
            {/* Primary Button (Opção C: Reto / Arquitetônico rounded-none) */}
            <a
              href="#products"
              onClick={(e) => handleNavClick(e, 'products')}
              className="group h-[52px] px-8 sm:px-9 bg-[#F4EFE9] text-[#111111] border border-[#F4EFE9] rounded-none text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[#C06A35] hover:text-white hover:border-[#C06A35] hover:-translate-y-[2px] transition-all duration-250 ease-out shadow-sm hover:shadow-xl inline-flex items-center justify-center gap-3"
            >
              <span>{hero.buttonText || 'Descobrir peças'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>

            {/* Secondary Button */}
            <a
              href="/sobre"
              onClick={(e) => { e.preventDefault(); navigate('/sobre'); }}
              className="group relative py-3 px-4 text-xs sm:text-sm font-medium tracking-[0.2em] text-white/90 uppercase transition-colors hover:text-white inline-flex items-center justify-center"
            >
              <span>Nossa história</span>
              <span className="absolute bottom-1 left-0 right-0 h-[1px] bg-white/40 group-hover:bg-white transition-all duration-300 scale-x-0 group-hover:scale-x-100 origin-left"></span>
            </a>
          </div>

        </div>
      </div>

      {/* Slide Indicators / Navigation Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex items-center gap-3">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlideIndex(index)}
            aria-label={`Slide ${index + 1}`}
            aria-current={index === currentSlideIndex ? 'true' : undefined}
            className="group flex h-6 min-w-6 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={`block h-1 rounded-full transition-all duration-500 ${index === currentSlideIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 group-hover:bg-white/70'}`}
            />
          </button>
        ))}
      </div>

      {/* Subtle Scroll Indicator */}
      <button
        type="button"
        className="absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2.5 text-white opacity-60 transition-opacity hover:opacity-100 sm:flex"
        onClick={(e) => handleNavClick(e, 'products')}
        aria-label="Scroll — ir para as novidades"
      >
        <span className="text-[9px] uppercase tracking-[0.25em] font-light">Scroll</span>
        <div className="w-[1px] h-6 bg-gradient-to-b from-white via-white/50 to-transparent animate-pulse"></div>
      </button>

    </section>
  );
};

export default Hero;
