import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from '../utils/apiErrors';

describe('getApiErrorMessage', () => {
  it('lê o novo formato padronizado', () => {
    expect(getApiErrorMessage({ error: { code: 'RATE_LIMITED', message: 'Aguarde.' } }, 'Falhou.'))
      .toBe('Aguarde.');
  });

  it('mantém compatibilidade com erros antigos', () => {
    expect(getApiErrorMessage({ error: 'Erro antigo.' }, 'Falhou.')).toBe('Erro antigo.');
  });

  it('usa uma mensagem segura quando a resposta é inesperada', () => {
    expect(getApiErrorMessage({ detail: 'segredo técnico' }, 'Tente novamente.')).toBe('Tente novamente.');
  });
});

