import { create } from 'zustand';
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
  fetchProducts: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  cart: [],
  isCartOpen: false,
  
  addToCart: (product) => {
    const { cart } = get();
    // Bloqueio de Carrinho: Limitar a 1 (peça única)
    const alreadyInCart = cart.find(p => p.id === product.id);
    if (!alreadyInCart) {
      set({ cart: [...cart, product], isCartOpen: true });
    } else {
      set({ isCartOpen: true }); // Apenas abre o carrinho se já tiver
    }
  },
  
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(p => p.id !== productId) });
  },
  
  clearCart: () => set({ cart: [] }),
  
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

  products: [],
  isLoadingProducts: false,

  fetchProducts: async () => {
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
    }));

    set({ products: mappedProducts, isLoadingProducts: false });
  }
}));
