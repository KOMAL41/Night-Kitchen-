import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { Product } from "../lib/api";

type CartLine = { product: Product; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  itemCount: number;
  total: number;
};

function effectivePrice(product: Product) {
  return product.discounted_price && product.discounted_price < product.price
    ? product.discounted_price
    : product.price;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  function addItem(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeItem(productId: number) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function setQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function clear() {
    setLines([]);
  }

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);
  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * effectivePrice(l.product), 0),
    [lines]
  );

  return (
    <CartContext.Provider value={{ lines, addItem, removeItem, setQuantity, clear, itemCount, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
