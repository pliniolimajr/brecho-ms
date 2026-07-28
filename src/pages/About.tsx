export function About() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-5xl mx-auto space-y-20">
        
        {/* Editorial Header */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#C06A35] font-bold">Nossa Essência</span>
          <h1 className="text-4xl md:text-5xl font-serif italic text-[#1A332B] leading-tight">Raízes baianas. Alma contemporânea.</h1>
          <div className="w-12 h-[1px] bg-[#C06A35]/30 mx-auto my-6"></div>
          <p className="text-[#423226] font-light text-lg md:text-xl leading-relaxed italic">
            "Acreditamos que vestir-se bem não significa seguir tendências, mas construir um guarda-roupa que reflita personalidade, conforto e confiança."
          </p>
        </div>

        {/* Brand Story and Curation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-serif text-[#1A332B] border-b border-[#C06A35]/20 pb-2">A Nossa Origem</h2>
              <p className="text-sm text-[#423226] leading-relaxed font-light">
                A Palm Co. nasceu inspirada em Palmeirinha, um pequeno distrito do interior da Bahia onde o tempo parece seguir outro ritmo. Foi nesse ambiente de simplicidade, acolhimento e autenticidade que surgiu a inspiração para construir uma marca que valorizasse escolhas feitas com calma e intenção.
              </p>
              <p className="text-sm text-[#423226] leading-relaxed font-light">
                Essa origem não define um estilo específico de roupa, define um jeito de olhar. Assim como no interior aprendemos a reconhecer o valor das coisas bem feitas, a Palm Co. acredita que uma boa peça merece ser escolhida pela sua qualidade, pelo seu caimento e pela forma como faz alguém se sentir.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-serif text-[#1A332B] border-b border-[#C06A35]/20 pb-2">A Curadoria</h2>
              <p className="text-sm text-[#423226] leading-relaxed font-light">
                A Palm Co. não compete por preço, volume ou tendências passageiras. Nós competimos pela confiança no nosso olhar.
              </p>
              <p className="text-sm text-[#423226] leading-relaxed font-light">
                Cada peça passa pelo olhar rigoroso e sensível da nossa curadoria antes de chegar à cliente. Não importa sua origem; importa que ela faça sentido dentro do universo Palm Co.: elegante, autêntica, duradoura e fácil de incorporar ao seu dia a dia.
              </p>
            </div>
          </div>

          {/* Premium Manifesto Box */}
          <div className="bg-[#FAF9F6] p-10 md:p-12 border border-[#C06A35]/15 shadow-sm space-y-6">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#A8A29E] font-bold block">O Manifesto</span>
            <h3 className="font-serif text-[#1A332B] text-2xl italic leading-snug">
              Não acreditamos que estilo seja excesso.
            </h3>
            
            <div className="w-8 h-[1px] bg-[#C06A35]/30"></div>
            
            <ul className="space-y-4 text-sm text-[#423226] font-light leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full mt-2"></span>
                <span>Acreditamos em escolhas.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full mt-2"></span>
                <span>Acreditamos em roupas que permanecem.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full mt-2"></span>
                <span>Em peças que acompanham histórias.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full mt-2"></span>
                <span>Em descobrir beleza sem precisar procurar entre milhares de opções.</span>
              </li>
            </ul>
            
            <p className="text-xs text-[#C06A35] uppercase tracking-widest font-semibold pt-4">
              Nós fazemos essa escolha por você.
            </p>
          </div>
        </div>

        {/* Experience & Packaging */}
        <div className="border-t border-[#C06A35]/20 pt-16 space-y-8">
          <div className="text-center space-y-4 max-w-xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#A8A29E] font-bold block">A Experiência</span>
            <h2 className="text-3xl font-serif text-[#1A332B]">O Jeito Palm Co.</h2>
            <p className="text-sm text-[#423226] font-light leading-relaxed">
              Acreditamos que a experiência de compra deve ir muito além do produto. Cada etapa é desenhada para transmitir refinamento e atenção.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-gray-100 space-y-4 rounded-sm">
              <h3 className="font-serif text-[#1A332B] text-lg">Curadoria com Intenção</h3>
              <p className="text-xs text-[#423226] font-light leading-relaxed">
                Não escolhemos peças apenas porque estão em alta. Cada item é selecionado pelo design, qualidade, caimento e pela forma como conversa com o universo da Palm Co.
              </p>
            </div>
            
            <div className="bg-white p-8 border border-gray-100 space-y-4 rounded-sm">
              <h3 className="font-serif text-[#1A332B] text-lg">Estilo que Permanece</h3>
              <p className="text-xs text-[#423226] font-light leading-relaxed">
                Acreditamos em um guarda-roupa construído ao longo do tempo. Por isso, buscamos peças que acompanham diferentes momentos, tendências e versões de quem as veste.
              </p>
            </div>

            <div className="bg-white p-8 border border-gray-100 space-y-4 rounded-sm">
              <h3 className="font-serif text-[#1A332B] text-lg">Experiência que Acolhe</h3>
              <p className="text-xs text-[#423226] font-light leading-relaxed">
                Comprar na Palm Co. deve ser leve, intuitivo e prazeroso. Cada detalhe da jornada é pensado para transmitir confiança, cuidado e a sensação de ter feito uma boa escolha.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default About;
