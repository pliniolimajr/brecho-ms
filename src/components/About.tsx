import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="bg-[#F4E4D4]">
      
      {/* Introduction / Story */}
      <div className="py-24 px-6 md:px-12 max-w-[1800px] mx-auto flex flex-col md:flex-row items-start gap-16 md:gap-32">
        <div className="md:w-1/3">
          <h2 className="text-4xl md:text-6xl font-serif text-[#1A332B] leading-tight">
            Raízes baianas.<br/>Alma contemporânea.
          </h2>
        </div>
        <div className="md:w-2/3 max-w-2xl">
          <p className="text-lg md:text-xl text-[#423226] font-light leading-relaxed mb-8">
            A Palm Co. nasceu inspirada em Palmeirinha, um pequeno distrito do interior da Bahia onde o tempo parece seguir outro ritmo. Foi nesse ambiente de simplicidade, acolhimento e autenticidade que surgiu a inspiração para construir uma marca que valorizasse escolhas feitas com calma e intenção.
          </p>
          <p className="text-lg md:text-xl text-[#423226] font-light leading-relaxed mb-8">
            Essa origem não define um estilo específico de roupa; define um jeito de olhar. Mais do que reunir roupas, a Palm Co. seleciona peças que compartilham uma mesma visão de estilo: elegância descomplicada, qualidade, autenticidade e versatilidade. Cada peça passa pelo olhar sensível da nossa curadoria antes de chegar até você.
          </p>
          <img 
            src="https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&q=80&w=1200" 
            alt="Interior da Loja" 
            className="w-full h-[400px] object-cover grayscale contrast-[0.9] brightness-110 mt-12"
          />
          <p className="text-sm font-medium uppercase tracking-widest text-[#A8A29E] mt-4">
            Curadoria Palm Co.
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
           <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#423226] mb-6">Confiança</span>
           <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#1A332B] leading-tight">
             Curadoria antes<br/>de quantidade.
           </h3>
           <p className="text-lg text-[#423226] font-light leading-relaxed mb-12 max-w-md">
             A Palm Co. não compete por preço, volume ou tendências passageiras. Nós competimos pela confiança no nosso olhar. Acreditamos que vestir-se bem não significa acumular, mas sim escolher peças bonitas, bem construídas e fáceis de incorporar ao seu dia a dia.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        <div className="flex flex-col justify-center p-12 lg:p-24 bg-[#1A332B] text-[#FDF6F0]">
           <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-6">Manifesto</span>
           <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#FDF6F0] leading-tight">
             Acreditamos em escolhas.
           </h3>
           <p className="text-lg text-[#A8A29E] font-light leading-relaxed mb-12 max-w-md">
             Não acreditamos que estilo seja excesso. Acreditamos em roupas que permanecem, em peças que acompanham histórias e em descobrir beleza sem precisar procurar entre milhares de opções de fast-fashion. Nós fazemos essa escolha criteriosa por você.
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