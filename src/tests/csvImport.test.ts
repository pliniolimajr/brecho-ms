import { describe, expect, it } from 'vitest';
import { buildProductCsvPreview, parseDelimitedText } from '../utils/csvImport';

describe('importação CSV de produtos', () => {
  it('interpreta campos entre aspas e delimitadores', () => {
    expect(parseDelimitedText('name;description\nVestido;"Linho; premium"'))
      .toEqual([['name', 'description'], ['Vestido', 'Linho; premium']]);
  });

  it('preserva estoque zero', () => {
    const [row] = buildProductCsvPreview('name;price;image_url;stock_quantity\nPeça;100;https://img.test/a.jpg;0');
    expect(row.stock).toBe(0);
    expect(row.payload.stock_quantity).toBe(0);
    expect(row.errors).toEqual([]);
  });

  it('aponta campos inválidos e SKU duplicado', () => {
    const rows = buildProductCsvPreview('name;sku;price;image_url\nPeça;ABC;50;url\n;ABC;-2;');
    expect(rows[1].errors).toEqual(expect.arrayContaining([
      'Nome obrigatório', 'Imagem principal obrigatória', 'Preço inválido', 'SKU repetido no arquivo',
    ]));
  });
});
