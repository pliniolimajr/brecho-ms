import { describe, it, expect } from 'vitest';

// Espelhamento das regras de negócio do Checkout.tsx para testes unitários isolados
function calculateDiscount(subtotal: number, coupon: { discount_type: 'percentage' | 'fixed'; discount_value: number }) {
  if (coupon.discount_type === 'percentage') {
    return (subtotal * coupon.discount_value) / 100;
  } else {
    return Math.min(coupon.discount_value, subtotal);
  }
}

function validateCoupon(
  coupon: {
    is_active: boolean;
    min_purchase_amount: number;
    valid_until?: string | null;
    valid_from?: string | null;
    max_uses?: number | null;
    used_count: number;
  },
  subtotal: number,
  now: Date = new Date()
) {
  if (!coupon.is_active) {
    return 'Cupom inválido ou expirado.';
  }
  if (subtotal < coupon.min_purchase_amount) {
    return `O valor mínimo para usar este cupom é R$ ${coupon.min_purchase_amount}`;
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return 'Este cupom já expirou.';
  }
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return 'Este cupom ainda não é válido.';
  }
  if (coupon.max_uses !== undefined && coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return 'Este cupom atingiu o limite máximo de usos.';
  }
  return null; // Válido
}

describe('Coupon Calculation and Validation', () => {
  describe('calculateDiscount()', () => {
    it('should calculate percentage discount correctly', () => {
      const coupon = { discount_type: 'percentage' as const, discount_value: 10 };
      expect(calculateDiscount(150, coupon)).toBe(15);
      expect(calculateDiscount(200, coupon)).toBe(20);
    });

    it('should calculate fixed value discount correctly', () => {
      const coupon = { discount_type: 'fixed' as const, discount_value: 50 };
      expect(calculateDiscount(150, coupon)).toBe(50);
    });

    it('should cap fixed value discount to subtotal if subtotal is smaller', () => {
      const coupon = { discount_type: 'fixed' as const, discount_value: 100 };
      expect(calculateDiscount(80, coupon)).toBe(80);
    });
  });

  describe('validateCoupon()', () => {
    const validCoupon = {
      is_active: true,
      min_purchase_amount: 100,
      used_count: 0,
      max_uses: 10,
      valid_from: null,
      valid_until: null,
    };

    it('should pass validation for a valid coupon meeting all conditions', () => {
      const result = validateCoupon(validCoupon, 120);
      expect(result).toBeNull();
    });

    it('should block inactive coupons', () => {
      const result = validateCoupon({ ...validCoupon, is_active: false }, 120);
      expect(result).toBe('Cupom inválido ou expirado.');
    });

    it('should block subtotal below min_purchase_amount', () => {
      const result = validateCoupon(validCoupon, 80);
      expect(result).toContain('O valor mínimo para usar este cupom é R$ 100');
    });

    it('should block expired coupons', () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1h ago
      const result = validateCoupon({ ...validCoupon, valid_until: pastDate }, 120);
      expect(result).toBe('Este cupom já expirou.');
    });

    it('should block coupons not yet valid', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString(); // 1h future
      const result = validateCoupon({ ...validCoupon, valid_from: futureDate }, 120);
      expect(result).toBe('Este cupom ainda não é válido.');
    });

    it('should block coupons with max usage reached', () => {
      const result = validateCoupon({ ...validCoupon, used_count: 5, max_uses: 5 }, 120);
      expect(result).toBe('Este cupom atingiu o limite máximo de usos.');
    });
  });
});
