import { Link } from 'react-router-dom';
import { ResponsiveLocalImage } from '../components/ResponsiveLocalImage';
import { Seo } from '../components/Seo';

const PRINCIPLES = [
  ['01', 'Escolher com calma', 'Menos opções, mais intenção em cada peça que entra na curadoria.'],
  ['02', 'Valorizar o que permanece', 'Design, qualidade e versatilidade acima de tendências passageiras.'],
  ['03', 'Comprar com confiança', 'Informação honesta, cuidado no envio e uma experiência sem excesso.'],
];

export function About() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#FDF6F0] pb-24 pt-24 animate-fade-in-up">
      <Seo
        title="Sobre a Palm CO."
        description="Conheça a origem baiana, os valores e o olhar de curadoria da Palm CO. para uma moda mais consciente e duradoura."
        path="/sobre"
      />

      <section className="palm-shell pb-20 pt-6 sm:pt-10" aria-labelledby="about-title">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-6 lg:pb-10 lg:pr-8">
            <p className="palm-eyebrow mb-7">Nossa essência</p>
            <h1 id="about-title" className="palm-display max-w-3xl text-5xl sm:text-6xl lg:text-7xl">
              Raízes baianas.<br />Olhar contemporâneo.
            </h1>
            <p className="mt-8 max-w-md text-base font-light leading-8 text-[#423226]">
              A Palm CO. nasceu de um jeito de olhar: reconhecer beleza, qualidade e presença sem precisar de excesso.
            </p>

            <dl className="mt-12 grid max-w-lg grid-cols-2 gap-x-8 gap-y-6 border-t border-[#C06A35]/20 pt-6 text-sm sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              <div>
                <dt className="palm-eyebrow mb-2">Origem</dt>
                <dd className="text-[#1A332B]">Bahia, Brasil</dd>
              </div>
              <div>
                <dt className="palm-eyebrow mb-2">Escolha</dt>
                <dd className="text-[#1A332B]">Curadoria independente</dd>
              </div>
              <div>
                <dt className="palm-eyebrow mb-2">Propósito</dt>
                <dd className="text-[#1A332B]">Moda circular</dd>
              </div>
            </dl>
          </div>

          <div className="relative min-w-0 lg:col-span-6 lg:pl-8">
            <div className="palm-product-media aspect-[4/5] lg:aspect-[4/3] lg:max-h-[620px]">
              <ResponsiveLocalImage
                basePath="/images/optimized/curadoria3"
                fallbackSrc="/images/curadoria3.png"
                widths={[640, 1200, 1357]}
                width={1357}
                height={903}
                alt="Tecidos e texturas selecionados pela curadoria Palm CO."
                sizes="(min-width: 1024px) 58vw, 100vw"
                loading="eager"
                fetchPriority="high"
                className="palm-product-image grayscale-[15%] contrast-[0.95]"
              />
            </div>
            <p className="palm-eyebrow mt-4 text-right">
              Palmeirinha · Bahia
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#C06A35]/15 bg-[#F4E4D4]" aria-labelledby="origin-title">
        <div className="palm-shell grid gap-12 py-20 lg:grid-cols-12 lg:gap-20 lg:py-28">
          <div className="lg:col-span-4">
            <p className="palm-eyebrow mb-6">A origem</p>
            <h2 id="origin-title" className="palm-display text-4xl sm:text-5xl">Um ritmo mais humano.</h2>
          </div>
          <div className="grid gap-7 text-base font-light leading-8 text-[#423226] lg:col-span-7 lg:col-start-6 lg:grid-cols-2">
            <p>
              Nossa inspiração vem de Palmeirinha, no interior da Bahia — um lugar onde o tempo convida a perceber o valor das coisas bem-feitas.
            </p>
            <p>
              Essa origem não determina um estilo de roupa. Ela orienta nossas escolhas: peças autênticas, duradouras e fáceis de levar para a vida real.
            </p>
          </div>
        </div>
      </section>

      <section className="grid min-h-[75vh] lg:grid-cols-2" aria-labelledby="curation-title">
        <div className="relative min-h-[520px] overflow-hidden lg:min-h-[760px]">
          <ResponsiveLocalImage
            basePath="/images/optimized/corrente1"
            fallbackSrc="/images/corrente1.jpg"
            widths={[640, 1200, 1920]}
            width={1920}
            height={1280}
            alt="Detalhe de corrente que representa permanência e continuidade"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.82] grayscale-[10%]"
          />
          <p className="absolute bottom-6 left-6 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:bottom-10 sm:left-10">
            Matéria · detalhe · permanência
          </p>
        </div>

        <div className="flex items-center bg-[#1A332B] px-6 py-20 text-[#FDF6F0] sm:px-12 lg:px-20">
          <div className="max-w-xl">
            <p className="mb-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D49A75]">O olhar Palm CO.</p>
            <h2 id="curation-title" className="font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Curadoria antes de quantidade.
            </h2>
            <p className="mt-8 max-w-lg text-base font-light leading-8 text-[#FDF6F0]/78">
              Não queremos reunir tudo. Selecionamos aquilo que tem personalidade, boa construção e liberdade para atravessar diferentes momentos.
            </p>

            <blockquote className="mt-12 border-l border-[#D49A75] pl-6 font-serif text-2xl italic leading-9 text-[#FDF6F0]">
              “Estilo não é excesso. É reconhecer o que merece permanecer.”
            </blockquote>
          </div>
        </div>
      </section>

      <section className="bg-[#FDF6F0] pb-10 pt-20 lg:pb-12 lg:pt-28" aria-labelledby="principles-title">
        <div className="palm-shell">
          <div className="mb-14 max-w-2xl">
            <p className="palm-eyebrow mb-5">O jeito Palm CO.</p>
            <h2 id="principles-title" className="palm-display text-4xl sm:text-5xl">Três escolhas que orientam tudo.</h2>
          </div>

          <ol className="grid border-t border-[#C06A35]/25 md:grid-cols-3">
            {PRINCIPLES.map(([number, title, description]) => (
              <li key={number} className="border-b border-[#C06A35]/25 py-8 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <span className="font-serif text-sm italic text-[#8A4825]">{number}</span>
                <h3 className="mt-8 font-serif text-2xl text-[#1A332B]">{title}</h3>
                <p className="mt-4 max-w-sm text-sm font-light leading-7 text-[#423226]">{description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
            <p className="max-w-xl font-serif text-3xl leading-tight text-[#1A332B] sm:text-4xl">
              Peças escolhidas para viver novas histórias.
            </p>
            <Link
              to="/catalogo"
              className="inline-flex min-h-12 items-center gap-4 border-b border-[#1A332B] py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A332B] transition-colors hover:border-[#8A4825] hover:text-[#8A4825]"
            >
              Conhecer a curadoria
              <span aria-hidden="true" className="text-base">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
