import { z } from 'zod';
import { isValidCPF } from './validators';

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
] as const;

export const onlyDigits = (value: string) => value.replace(/\D/g, '');
export const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const requiredText = (label: string, max: number) => z.string()
  .transform(normalizeText)
  .pipe(z.string().min(1, `${label} é obrigatório.`).max(max, `${label} deve ter no máximo ${max} caracteres.`));

export const nameSchema = requiredText('Nome', 80)
  .refine((value) => value.length >= 2, 'Nome deve ter pelo menos 2 caracteres.');

export const emailSchema = z.string()
  .transform(normalizeEmail)
  .pipe(z.string().min(1, 'E-mail é obrigatório.').max(254, 'E-mail muito longo.').email('E-mail inválido.'));

export const cpfSchema = z.string().transform(onlyDigits).refine(isValidCPF, 'CPF inválido.');

export const phoneSchema = z.string()
  .transform(onlyDigits)
  .refine((value) => value.length === 10 || value.length === 11, 'Telefone deve ter DDD e 10 ou 11 dígitos.');

export const cepSchema = z.string()
  .transform(onlyDigits)
  .refine((value) => value.length === 8, 'CEP deve ter 8 dígitos.');

export const stateSchema = z.string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.enum(BRAZILIAN_STATES, { error: 'UF inválida.' }));

export const checkoutIdentitySchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  cpf: cpfSchema,
});

export const addressSchema = z.object({
  zipCode: cepSchema,
  street: requiredText('Rua', 120),
  number: requiredText('Número', 20),
  complement: z.string().transform(normalizeText).pipe(z.string().max(100, 'Complemento deve ter no máximo 100 caracteres.')),
  neighborhood: requiredText('Bairro', 80),
  city: requiredText('Cidade', 80),
  state: stateSchema,
});

export const profileSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  cpf: z.union([z.literal(''), cpfSchema]),
  birth_date: z.string().max(10, 'Data de nascimento inválida.'),
  phone: phoneSchema,
});

export const newsletterSchema = z.object({ name: nameSchema, email: emailSchema });

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message || 'Verifique os dados informados.';
}
