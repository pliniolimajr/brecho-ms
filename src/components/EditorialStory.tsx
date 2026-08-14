import { Link } from 'react-router-dom';
import { ResponsiveLocalImage } from './ResponsiveLocalImage';

const VALUES = [
  ['01', 'Curadoria'],
  ['02', 'Peças singulares'],
  ['03', 'Escolhas com intenção'],
];

export function EditorialStory() {
  return (
    <section className="palm-section overflow-hidden bg-[#F4E4D4]" aria-labelledby="editorial-story-title">
      <div className="palm-shell">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="relative lg:col-span-7">
            <div className="palm-product-media aspect-[4/5] max-h-[760px] lg:mr-12">
              <ResponsiveLocalImage
                basePath="/images/optimized/curadoria2"
                fallbackSrc="/images/curadoria2.jpg"
                widths={[640, 1200, 1920]}
                width={1920}
                height={1440}
                alt="Ambiente da curadoria Palm CO."
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="palm-product-image grayscale-[20%] contrast-[0.95]"
              />
            </div>
            <p className="palm-eyebrow mt-4 text-right lg:absolute lg:-right-8 lg:bottom-12 lg:mt-0 lg:-rotate-90 lg:bg-[#F4E4D4] lg:px-4 lg:py-2">
              Bahia · Brasil
            </p>
          </div>

          <div className="lg:col-span-5 lg:pl-10">
            <span className="palm-eyebrow mb-7 block">O olhar Palm CO.</span>
            <h2 id="editorial-story-title" className="palm-display mb-8 text-5xl sm:text-6xl lg:text-7xl">
              Menos excesso.<br />Mais presença.
            </h2>
            <p className="max-w-lg text-base font-light leading-8 text-[#423226] md:text-lg">
              Não reunimos tudo. Escolhemos o que merece permanecer: peças com personalidade, construção cuidadosa e liberdade para atravessar diferentes momentos da sua vida.
            </p>

            <ol className="my-10 border-y border-[#C06A35]/25">
              {VALUES.map(([number, label]) => (
                <li key={number} className="flex items-center gap-5 border-b border-[#C06A35]/20 py-4 last:border-b-0">
                  <span className="font-serif text-sm italic text-[#8A4825]">{number}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1A332B]">{label}</span>
                </li>
              ))}
            </ol>

            <Link to="/sobre" className="group inline-flex min-h-12 items-center gap-4 border-b border-[#1A332B] py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A332B] hover:border-[#8A4825] hover:text-[#8A4825]">
              Conheça nossa história
              <span aria-hidden="true" className="text-base transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
