import { useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useStore } from '../../store/useStore';
import { useToast } from '../../components/Toast';
import { buildProductCsvPreview, type CsvPreviewRow } from '../../utils/csvImport';

interface AdminCsvImportProps { fetchAdminProducts: () => Promise<void> }

export function AdminCsvImport({ fetchAdminProducts }: AdminCsvImportProps) {
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvPreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);

  const chooseFile = () => fileInput.current?.click();
  const readFile = async (file: File) => {
    setChecking(true); setFileName(file.name);
    try {
      const preview = buildProductCsvPreview(await file.text());
      if (!preview.length) throw new Error('O arquivo está vazio ou não possui linhas de produtos.');
      const skus = preview.map(row => row.sku).filter((sku): sku is string => !!sku);
      if (skus.length) {
        const { data, error } = await supabase.from('products').select('sku').in('sku', skus);
        if (error) throw error;
        const existing = new Set((data || []).map(product => product.sku?.toUpperCase()));
        preview.forEach(row => { if (row.sku && existing.has(row.sku)) row.errors.push('SKU já cadastrado'); });
      }
      setRows(preview); setOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível ler o CSV.', 'error');
    } finally { setChecking(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const validRows = rows.filter(row => row.errors.length === 0);
  const importRows = async () => {
    if (!validRows.length) return;
    setImporting(true);
    const { error } = await supabase.from('products').insert(validRows.map(row => row.payload));
    if (error) showToast(`A importação foi cancelada sem salvar produtos. ${error.message}`, 'error');
    else {
      showToast(`${validRows.length} produto(s) importado(s) com sucesso.`, 'success');
      setOpen(false); setRows([]);
      await Promise.all([fetchAdminProducts(), useStore.getState().fetchProducts(true)]);
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const header = 'name;sku;price;image_url;stock_quantity;category;size;brand;material;color;features;acquisition_cost;source;acquired_at;description';
    const example = 'Vestido exemplo;PALM-0001;299,90;https://exemplo.com/foto.jpg;1;Vestidos;M;Marca;Linho;Bege|Cru;Forrado|Midi;120,00;Fornecedor;2026-08-19;Descrição da peça';
    const url = URL.createObjectURL(new Blob([`\uFEFF${header}\n${example}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'modelo_produtos_palm_co.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <>
    <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void readFile(file); }} />
    <div className="flex gap-2">
      <button type="button" onClick={downloadTemplate} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600 underline">Baixar modelo</button>
      <button type="button" onClick={chooseFile} disabled={checking} className="border border-[#1A332B] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#1A332B] hover:bg-[#1A332B] hover:text-white disabled:opacity-50">{checking ? 'Analisando...' : 'Importar CSV'}</button>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="csv-preview-title">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden border bg-white shadow-xl">
        <div className="flex items-start justify-between border-b p-5"><div><h3 id="csv-preview-title" className="font-serif text-2xl text-[#1A332B]">Revisar importação</h3><p className="text-xs text-gray-500">{fileName} · {validRows.length} válidas · {rows.length - validRows.length} com erro</p></div><button type="button" onClick={() => setOpen(false)} className="text-xl" aria-label="Fechar">×</button></div>
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[#FDF6F0]"><tr><th className="p-3">Linha</th><th className="p-3">Produto</th><th className="p-3">SKU</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3">Validação</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.line} className={`border-t ${row.errors.length ? 'bg-red-50' : ''}`}><td className="p-3">{row.line}</td><td className="p-3 font-semibold">{row.name || '—'}</td><td className="p-3 font-mono text-xs">{row.sku || '—'}</td><td className="p-3">R$ {row.price.toFixed(2).replace('.', ',')}</td><td className="p-3">{row.stock}</td><td className="p-3 text-xs">{row.errors.length ? <span className="text-red-700">{row.errors.join(' · ')}</span> : <span className="text-green-700">Pronto para importar</span>}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5"><p className="text-xs text-gray-500">Linhas com erro serão ignoradas. Se o banco rejeitar a operação, nenhum produto será salvo.</p><div className="flex gap-3"><button type="button" onClick={() => setOpen(false)} className="border px-5 py-2 text-xs font-bold uppercase">Cancelar</button><button type="button" onClick={() => void importRows()} disabled={!validRows.length || importing} className="bg-[#1A332B] px-5 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">{importing ? 'Importando...' : `Importar ${validRows.length} produto(s)`}</button></div></div>
      </div>
    </div>}
  </>;
}
