'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  Cart,
  createCart,
  getCart,
  addToCart as addToCartApi,
  updateCartItem as updateCartItemApi,
  removeCartItem as removeCartItemApi,
} from '@/lib/medusa';

const CART_ID_KEY = 'medusa_cart_id';

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  itemCount: number;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 計算購物車商品數量
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // 初始化購物車
  const initCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 嘗試從 localStorage 取得 cart_id
      const savedCartId = localStorage.getItem(CART_ID_KEY);

      if (savedCartId) {
        try {
          const { cart: existingCart } = await getCart(savedCartId);
          setCart(existingCart);
          return;
        } catch {
          // Cart 不存在或過期，建立新的
          localStorage.removeItem(CART_ID_KEY);
        }
      }

      // 建立新購物車
      const { cart: newCart } = await createCart();
      localStorage.setItem(CART_ID_KEY, newCart.id);
      setCart(newCart);
    } catch (err) {
      console.error('Failed to initialize cart:', err);
      setError('無法載入購物車');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    initCart();
  }, [initCart]);

  // 重新載入購物車
  const refreshCart = useCallback(async () => {
    if (!cart?.id) return;
    
    try {
      const { cart: updatedCart } = await getCart(cart.id);
      setCart(updatedCart);
    } catch (err) {
      console.error('Failed to refresh cart:', err);
    }
  }, [cart?.id]);

  // 加入商品
  const addItem = useCallback(
    async (variantId: string, quantity: number = 1) => {
      if (!cart?.id) {
        setError('購物車未初始化');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const { cart: updatedCart } = await addToCartApi(cart.id, variantId, quantity);
        setCart(updatedCart);
      } catch (err) {
        console.error('Failed to add item:', err);
        setError('加入購物車失敗');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cart?.id]
  );

  // 更新數量
  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      if (!cart?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        if (quantity <= 0) {
          // 數量為 0 則移除
          const { cart: updatedCart } = await removeCartItemApi(cart.id, itemId);
          setCart(updatedCart);
        } else {
          const { cart: updatedCart } = await updateCartItemApi(cart.id, itemId, quantity);
          setCart(updatedCart);
        }
      } catch (err) {
        console.error('Failed to update item:', err);
        setError('更新失敗');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cart?.id]
  );

  // 移除商品
  const removeItem = useCallback(
    async (itemId: string) => {
      if (!cart?.id) return;

      try {
        setIsLoading(true);
        setError(null);
        const { cart: updatedCart } = await removeCartItemApi(cart.id, itemId);
        setCart(updatedCart);
      } catch (err) {
        console.error('Failed to remove item:', err);
        setError('移除失敗');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cart?.id]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        error,
        itemCount,
        addItem,
        updateItem,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
