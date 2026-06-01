import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="bg-[#F4E4D4]">
      
      {/* Introduction / Story */}
      <div className="py-24 px-6 md:px-12 max-w-[1800px] mx-auto flex flex-col md:flex-row items-start gap-16 md:gap-32">
        <div className="md:w-1/3">
          <h2 className="text-4xl md:text-6xl font-serif text-[#1A332B] leading-tight">
            Nascido para dar<br/>nova vida.
          </h2>
        </div>
        <div className="md:w-2/3 max-w-2xl">
          <p className="text-lg md:text-xl text-[#423226] font-light leading-relaxed mb-8">
            O Brechó MS nasceu com um propósito simples e transformador: acreditamos que a moda sustentável não é apenas uma tendência, mas uma necessidade. Nossa curadoria resgata peças com histórias, qualidade e muito estilo.
          </p>
          <p className="text-lg md:text-xl text-[#423226] font-light leading-relaxed mb-8">
            Nós valorizamos tecidos que resistem ao tempo e modelagens que contam histórias. Garimpar é um ato de consciência e exclusividade. O nosso objetivo é conectar você a essas escolhas autênticas.
          </p>
          <img 
            src="https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&q=80&w=1200" 
            alt="Interior do Brechó" 
            className="w-full h-[400px] object-cover grayscale contrast-[0.9] brightness-110 mt-12"
          />
          <p className="text-sm font-medium uppercase tracking-widest text-[#A8A29E] mt-4">
            Curadoria Brechó MS
          </p>
        </div>
      </div>

      {/* Philosophy Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        <div className="order-2 lg:order-1 relative h-[500px] lg:h-auto overflow-hidden group">
           <img 
             src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1200" 
             alt="Tecidos e Texturas" 
             className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
           />
        </div>
        <div className="order-1 lg:order-2 flex flex-col justify-center p-12 lg:p-24 bg-[#C06A35]">
           <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#423226] mb-6">Qualidade</span>
           <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#1A332B] leading-tight">
             Peças únicas<br/>e duradouras.
           </h3>
           <p className="text-lg text-[#423226] font-light leading-relaxed mb-12 max-w-md">
             Rejeitamos o descartável. Cada peça do Brechó MS passa por um controle rigoroso de qualidade. Focamos em algodão, linho, jeans encorpados e tecidos que envelhecem com graça, mantendo o seu charme intacto.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        <div className="flex flex-col justify-center p-12 lg:p-24 bg-[#1A332B] text-[#FDF6F0]">
           <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-6">O Nosso Propósito</span>
           <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#FDF6F0] leading-tight">
             Moda Inteligente.
           </h3>
           <p className="text-lg text-[#A8A29E] font-light leading-relaxed mb-12 max-w-md">
             Diminuir o impacto ambiental não significa abrir mão do estilo. A moda inteligente celebra a individualidade. Comprar de segunda mão é a escolha de quem valoriza o design autêntico e o consumo consciente.
           </p>
        </div>
        <div className="relative h-[500px] lg:h-auto overflow-hidden group">
           <img 
             src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200" 
             alt="Moda Sustentável" 
             className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 brightness-90"
           />
        </div>
      </div>
    </section>
  );
};

export default About;