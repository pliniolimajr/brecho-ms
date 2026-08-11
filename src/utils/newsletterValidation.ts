const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewsletter(name: string, email: string) {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedName.length < 2) return { success: false as const, message: 'Nome deve ter pelo menos 2 caracteres.' };
  if (normalizedName.length > 80) return { success: false as const, message: 'Nome deve ter no máximo 80 caracteres.' };
  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    return { success: false as const, message: 'E-mail inválido.' };
  }
  return { success: true as const, data: { name: normalizedName, email: normalizedEmail } };
}
