import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import type { Product } from '../types';

const mockProduct1: Product = {
  id: 'prod-1',
  name: 'Camisa de Linho',
  tagline: '100% Linho',
  description: 'Camisa leve de linho',
  longDescription: '',
  price: 150.00,
  category: 'Camisetas',
  imageUrl: 'https://example.com/image.jpg',
  size: 'M',
  brand: 'Palm CO.',
  color: ['Branco'],
  material: 'Linho',
  stockQuantity: 5,
  features: [],
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Calça Chino',
  tagline: 'Algodão Premium',
  description: 'Calça chino clássica',
  longDescription: '',
  price: 250.00,
  category: 'Calças',
  imageUrl: 'https://example.com/image2.jpg',
  size: '42',
  brand: 'Palm CO.',
  color: ['Bege'],
  material: 'Algodão',
  stockQuantity: 2,
  features: [],
};

describe('useStore Zustand Store', () => {
  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.setState({ products: [], lastFetched: null });
  });

  it('should initialize with an empty cart', () => {
    const state = useStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.isCartOpen).toBe(false);
  });

  it('should add products to the cart', () => {
    useStore.getState().addToCart(mockProduct1);

    const state = useStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0]).toEqual(mockProduct1);
    expect(state.isCartOpen).toBe(true);
  });

  it('should remove products from the cart', () => {
    useStore.getState().addToCart(mockProduct1);
    useStore.getState().addToCart(mockProduct2);

    useStore.getState().removeFromCart(mockProduct1.id);

    const state = useStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].id).toBe(mockProduct2.id);
  });

  it('should clear the cart completely', () => {
    useStore.getState().addToCart(mockProduct1);
    useStore.getState().addToCart(mockProduct2);

    useStore.getState().clearCart();

    const state = useStore.getState();
    expect(state.cart).toEqual([]);
  });
});
