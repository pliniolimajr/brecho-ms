export interface CsvPreviewRow {
  line: number;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  payload: Record<string, unknown>;
  errors: string[];
}

export function parseDelimitedText(text: string): string[][] {
  const header = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (header.match(/;/g)?.length || 0) >= (header.match(/,/g)?.length || 0) ? ';' : ',';
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\r' || char === '\n') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(value => value !== '')) lines.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(value => value !== '')) lines.push(row);
  return lines;
}

export function buildProductCsvPreview(text: string): CsvPreviewRow[] {
  const rows = parseDelimitedText(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(header => header.trim().toLowerCase());
  const seenSkus = new Set<string>();

  return rows.slice(1).map((values, index) => {
    const source: Record<string, string> = {};
    headers.forEach((header, column) => { source[header] = values[column]?.trim() || ''; });
    const errors: string[] = [];
    const name = source.name;
    const sku = source.sku ? source.sku.toUpperCase() : null;
    const price = Number(source.price?.replace(',', '.'));
    const stock = source.stock_quantity === '' ? 1 : Number(source.stock_quantity);

    if (!name) errors.push('Nome obrigatório');
    if (!source.image_url) errors.push('Imagem principal obrigatória');
    if (source.price === '' || !Number.isFinite(price) || price < 0) errors.push('Preço inválido');
    if (!Number.isInteger(stock) || stock < 0) errors.push('Estoque inválido');
    if (sku && seenSkus.has(sku)) errors.push('SKU repetido no arquivo');
    if (sku) seenSkus.add(sku);

    return {
      line: index + 2, name, sku, price: Number.isFinite(price) ? price : 0,
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0, errors,
      payload: {
        name,
        sku,
        tagline: source.tagline || null,
        description: source.description || '',
        long_description: source.long_description || source.description || '',
        price: Number.isFinite(price) ? price : 0,
        category: source.category || 'Outros',
        size: source.size || 'ÚNICO',
        image_url: source.image_url,
        brand: source.brand || null,
        material: source.material || null,
        source: source.source || null,
        acquired_at: source.acquired_at || null,
        acquisition_cost: source.acquisition_cost ? Number(source.acquisition_cost.replace(',', '.')) : null,
        color: source.color ? source.color.split('|').map(value => value.trim()).filter(Boolean) : [],
        features: source.features ? source.features.split('|').map(value => value.trim()).filter(Boolean) : [],
        stock_quantity: Number.isInteger(stock) && stock >= 0 ? stock : 0,
      },
    };
  });
}
