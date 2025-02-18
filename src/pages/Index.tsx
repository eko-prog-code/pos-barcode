// pages/index.tsx
import { useState, useEffect } from "react";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import { Product, CartItem } from "@/types/pos";
import { useToast } from "@/components/ui/use-toast";
import { subscribeToProducts, updateProductStock } from "@/services/productService";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction, 
  update,
  remove,
  set
} from "firebase/database";

const CART_ID = "global"; // ID cart bersama untuk semua perangkat

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  // Simpan cart sebagai object: { [productId]: CartItem }
  const [cartItems, setCartItems] = useState<{ [key: string]: CartItem }>({});
  const { toast } = useToast();
  const db = getDatabase();

  // Subscribe ke produk secara realtime
  useEffect(() => {
    const unsubscribe = subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe ke data cart dari Realtime Database
  useEffect(() => {
    const cartRef = ref(db, `cart/${CART_ID}/items`);
    const unsubscribe = onValue(cartRef, (snapshot) => {
      const data = snapshot.val();
      // Jika belum ada data, set sebagai object kosong
      setCartItems(data || {});
    });
    return () => unsubscribe();
  }, [db]);

  // Fungsi addToCart tanpa menampilkan informasi stok ke pengguna
  const addToCart = async (product: Product) => {
    if (product.stock > 0) {
      try {
        // Kurangi stok produk secara internal
        await updateProductStock(product.id, product.stock - 1);
  
        const itemRef = ref(db, `cart/${CART_ID}/items/${product.id}`);
        const transactionResult = await runTransaction(itemRef, (currentItem) => {
          if (currentItem === null) {
            return { ...product, quantity: 1 };
          } else {
            return { ...currentItem, quantity: currentItem.quantity + 1 };
          }
        });
        
        if (transactionResult.committed) {
          toast({
            title: "Sukses",
            description: "Produk berhasil ditambahkan ke keranjang",
          });
        } else {
          toast({
            title: "Error",
            description: "Transaksi gagal, coba lagi",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan produk ke keranjang",
          variant: "destructive",
        });
        console.error("Error addToCart:", error);
      }
    } else {
      // Pesan error tidak menampilkan informasi stok
      toast({
        title: "Error",
        description: "Produk tidak tersedia",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk memperbarui jumlah produk di keranjang
  const updateQuantity = async (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    const cartItem = cartItems[productId];
    if (!product || !cartItem) return;

    const availableTotal = product.stock + cartItem.quantity;
    if (newQuantity > availableTotal) {
      toast({
        title: "Error",
        description: "Produk tidak mencukupi",
        variant: "destructive",
      });
      return;
    }

    const difference = newQuantity - cartItem.quantity;
    try {
      await updateProductStock(productId, product.stock - difference);
      const itemRef = ref(db, `cart/${CART_ID}/items/${productId}`);
      update(itemRef, { quantity: newQuantity });
      toast({
        title: "Sukses",
        description: "Jumlah produk berhasil diperbarui",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui jumlah produk",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const cartItem = cartItems[productId];
    if (product && cartItem) {
      try {
        await updateProductStock(productId, product.stock + cartItem.quantity);
        const itemRef = ref(db, `cart/${CART_ID}/items/${productId}`);
        remove(itemRef);
        toast({
          title: "Sukses",
          description: "Produk berhasil dihapus dari keranjang",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal menghapus produk dari keranjang",
          variant: "destructive",
        });
      }
    }
  };

  const clearCart = async () => {
    for (const productId in cartItems) {
      const item = cartItems[productId];
      const product = products.find((p) => p.id === productId);
      if (product) {
        try {
          await updateProductStock(productId, product.stock + item.quantity);
        } catch (error) {
          toast({
            title: "Error",
            description: `Gagal mengembalikan produk ${product.name}`,
            variant: "destructive",
          });
        }
      }
    }
    const cartRef = ref(db, `cart/${CART_ID}/items`);
    set(cartRef, null);
    toast({
      title: "Sukses",
      description: "Keranjang berhasil dikosongkan",
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">POS System</h1>
        <ProductGrid
          products={products}
          onAddToCart={addToCart}
          showEditButton={false}
        />
      </div>
      {/* Karena komponen Cart sudah mengelola state dan fungsinya sendiri,
          panggil Cart tanpa props tambahan */}
      <Cart />
    </div>
  );
};

export default Index;
