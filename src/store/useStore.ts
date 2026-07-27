import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabaseClient';
import type { Product } from '../types';

interface StoreState {
  // Cart State
  cart: Product[];
  isCartOpen: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  
  // Products State
  products: Product[];
  isLoadingProducts: boolean;
  lastFetched: number | null;
  fetchProducts: (force?: boolean) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
  cart: [],
  isCartOpen: false,
  
  addToCart: (product) => {
    const { cart } = get();
    set({ cart: [...cart, product], isCartOpen: true });
  },
  
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(p => p.id !== productId) });
  },
  
  clearCart: () => set({ cart: [] }),
  
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

  products: [],
  isLoadingProducts: false,
  lastFetched: null,

  fetchProducts: async (force = false) => {
    const { products, lastFetched } = get();
    if (!force && products.length > 0 && lastFetched && Date.now() - lastFetched < 30000) {
      return;
    }
    set({ isLoadingProducts: true });
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_sold', false);
      
    if (error) {
      console.error('Error fetching products:', error);
      set({ isLoadingProducts: false });
      return;
    }

    // Map snake_case from DB to camelCase in Frontend
    const mappedProducts: Product[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      longDescription: row.long_description,
      price: Number(row.price),
      category: row.category,
      imageUrl: row.image_url,
      gallery: row.gallery,
      features: row.features,
      size: row.size,
      brand: row.brand,
      color: row.color,
      material: row.material,
      measurements: row.measurements,
      stockQuantity: row.stock_quantity,
    }));

    set({ products: mappedProducts, isLoadingProducts: false, lastFetched: Date.now() });
  }
    }),
    {
      name: 'littlepalm-cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
