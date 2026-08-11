import { describe, expect, it } from 'vitest';
import { validateImageFile } from '../utils/imageUpload';

describe('validação de imagens de produto', () => {
  it('aceita os formatos previstos dentro do limite', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 2_000_000 })).toBeNull();
    expect(validateImageFile({ type: 'image/webp', size: 2_000_000 })).toBeNull();
    expect(validateImageFile({ type: 'image/avif', size: 2_000_000 })).toBeNull();
  });

  it('recusa formatos que não são imagens permitidas', () => {
    expect(validateImageFile({ type: 'image/svg+xml', size: 10_000 })).toContain('JPG, PNG, WebP ou AVIF');
  });

  it('recusa arquivos acima de 8 MB', () => {
    expect(validateImageFile({ type: 'image/png', size: 9 * 1024 * 1024 })).toContain('8 MB');
  });
});
