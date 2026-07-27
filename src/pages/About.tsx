export function About() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 bg-[#FDF6F0] animate-fade-in-up">
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C06A35] font-bold">Nossa Essência</span>
          <h1 className="text-4xl md:text-5xl font-serif text-[#1A332B]">Sobre a Little Palm Co.</h1>
          <p className="text-[#423226] max-w-xl mx-auto leading-relaxed">
            Uma curadoria dedicada a trazer o melhor da moda atemporal, com qualidade impecável e sofisticação minimalista.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-[#1A332B]">Nossa História</h2>
            <p className="text-sm text-[#423226] leading-relaxed">
              A Little Palm Co. nasceu em 2026 com o propósito de redefinir o consumo inteligente de moda premium. Acreditamos que o verdadeiro luxo está na durabilidade, no caimento perfeito e na escolha consciente de cada fio.
            </p>
            <p className="text-sm text-[#423226] leading-relaxed">
              Trabalhamos com curadoria cuidadosa de peças excepcionais, proporcionando aos nossos clientes uma experiência sofisticada de compra com marcas e tecidos selecionados.
            </p>
          </div>
          <div className="bg-[#F4E4D4] p-8 rounded border border-[#C06A35]/30 space-y-4">
            <h3 className="font-serif text-[#1A332B] text-lg">Nosso Compromisso</h3>
            <ul className="space-y-3 text-xs text-[#423226] tracking-wide uppercase font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full"></span>
                Curadoria Premium 100% Autêntica
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full"></span>
                Foco em Tecidos e Fibras Naturais
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full"></span>
                Consumo Sustentável e Inteligente
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#C06A35] rounded-full"></span>
                Atendimento Exclusivo e Personalizado
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
