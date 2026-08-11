import { describe, expect, it } from 'vitest';
import { addressSchema, checkoutIdentitySchema, newsletterSchema, normalizeEmail, normalizeText } from '../utils/schemas';

describe('schemas centralizados', () => {
  it('normaliza textos e e-mails', () => {
    expect(normalizeText('  Maria   da Silva ')).toBe('Maria da Silva');
    expect(normalizeEmail('  MARIA@EXAMPLE.COM ')).toBe('maria@example.com');
  });

  it('aceita e normaliza uma identificação válida', () => {
    const result = checkoutIdentitySchema.parse({
      firstName: ' Maria ', lastName: ' Silva ', email: ' MARIA@EXAMPLE.COM ',
      phone: '(71) 99999-9999', cpf: '529.982.247-25',
    });
    expect(result.email).toBe('maria@example.com');
    expect(result.phone).toBe('71999999999');
    expect(result.cpf).toBe('52998224725');
  });

  it('recusa CPF, telefone e e-mail inválidos', () => {
    const result = checkoutIdentitySchema.safeParse({
      firstName: 'Maria', lastName: 'Silva', email: 'email-invalido', phone: '123', cpf: '111.111.111-11',
    });
    expect(result.success).toBe(false);
  });

  it('valida CEP e UF brasileiros', () => {
    const valid = addressSchema.safeParse({
      zipCode: '40415-115', street: 'Rua Jorge Góes Mascarenhas', number: '57', complement: '',
      neighborhood: 'Bonfim', city: 'Salvador', state: 'ba',
    });
    const invalid = addressSchema.safeParse({
      zipCode: '123', street: 'Rua A', number: '1', complement: '', neighborhood: 'Centro', city: 'Cidade', state: 'XX',
    });
    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('normaliza cadastro da newsletter', () => {
    expect(newsletterSchema.parse({ name: '  Plínio  ', email: ' PLINIO@EXAMPLE.COM ' }))
      .toEqual({ name: 'Plínio', email: 'plinio@example.com' });
  });
});
