import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

function valueOrDash(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function ProductComparison() {
  const { comparison, toggleComparison, clearComparison } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!comparison.length) return null;

  return (
    <>
      <aside className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded bg-[#1A332B] px-4 py-3 text-white shadow-xl" aria-label="Produtos selecionados para comparação">
        <p className="text-sm"><strong>{comparison.length}/3</strong> produto(s) para comparar</p>
        <div className="flex gap-2">
          <button type="button" onClick={clearComparison} className="min-h-10 px-3 text-xs underline">Limpar</button>
          <button type="button" onClick={() => setIsOpen(true)} disabled={comparison.length < 2} className="min-h-10 rounded bg-[#C06A35] px-4 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50">
            Comparar agora
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="comparison-title" onMouseDown={event => event.stopPropagation()} className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-t-lg bg-[#FDF6F0] p-5 md:rounded-lg md:p-8">
            <header className="mb-6 flex items-center justify-between gap-4">
              <h2 id="comparison-title" className="font-serif text-2xl text-[#1A332B]">Comparar produtos</h2>
              <button ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)} aria-label="Fechar comparação" className="min-h-11 min-w-11 text-2xl">&times;</button>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-32 border-b border-[#C06A35]/30 p-3">Característica</th>
                    {comparison.map(product => (
                      <th key={product.id} className="border-b border-[#C06A35]/30 p-3 align-top">
                        <Link to={`/produto/${product.id}`} onClick={() => setIsOpen(false)} className="group block w-fit">
                          <img src={product.imageUrl} alt={product.name} className="mb-3 aspect-[5/7] w-24 rounded object-cover" />
                          <span className="block text-[#1A332B] underline-offset-4 group-hover:underline">{product.name}</span>
                        </Link>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link to={`/produto/${product.id}`} onClick={() => setIsOpen(false)} className="inline-flex min-h-10 items-center rounded bg-[#1A332B] px-3 text-[10px] font-bold uppercase tracking-wider text-white">
                            Ver produto
                          </Link>
                          <button type="button" onClick={() => toggleComparison(product)} className="min-h-10 text-xs text-[#8A4825] underline">Remover</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Preço', (product: typeof comparison[number]) => `R$ ${product.price.toFixed(2).replace('.', ',')}`],
                    ['Marca', (product: typeof comparison[number]) => valueOrDash(product.brand)],
                    ['Tamanho', (product: typeof comparison[number]) => valueOrDash(product.size)],
                    ['Material', (product: typeof comparison[number]) => valueOrDash(product.material)],
                    ['Cor', (product: typeof comparison[number]) => valueOrDash(product.color)],
                    ['Disponibilidade', (product: typeof comparison[number]) => product.isSold || product.stockQuantity === 0 ? 'Esgotado' : 'Disponível'],
                  ].map(([label, getter]) => (
                    <tr key={label as string}>
                      <th className="border-b border-[#C06A35]/20 p-3 text-[#423226]">{label as string}</th>
                      {comparison.map(product => <td key={product.id} className="border-b border-[#C06A35]/20 p-3">{(getter as (item: typeof product) => string)(product)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>
        </div>
      )}
    </>
  );
}
