// pages/products.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import ProductGrid from "@/components/pos/ProductGrid";
import { Product } from "@/types/pos";
import { useToast } from "@/components/ui/use-toast";
import {
  createProduct,
  deleteProduct,
  subscribeToProducts,
  updateProductStock,
} from "@/services/productService";
import { formatNumber } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showVerification, setShowVerification] = useState(true);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [selectedRule, setSelectedRule] = useState("");
  const [rules, setRules] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    regularPrice: "",
    barcode: "", // Field barcode sudah disediakan
  });
  const { toast } = useToast();

  // Ambil data rules dari Firebase (misalnya untuk verifikasi akses)
  useEffect(() => {
    const fetchRules = async () => {
      const rulesRef = ref(db, "rules");
      const snapshot = await get(rulesRef);
      if (snapshot.exists()) {
        setRules(snapshot.val());
      }
    };
    fetchRules();
  }, []);

  // Jika verifikasi sudah berhasil, lakukan subscribe produk secara realtime
  useEffect(() => {
    if (!showVerification) {
      const unsubscribe = subscribeToProducts((updatedProducts) => {
        setProducts(updatedProducts);
      });
      return () => unsubscribe();
    }
  }, [showVerification]);

  const handleVerify = () => {
    const selectedRuleData = rules[selectedRule];
    if (selectedRuleData && selectedRuleData.password === verificationPassword) {
      setShowVerification(false);
      setShowError(false);
      toast({
        title: "Berhasil",
        description: "Verifikasi berhasil",
      });
    } else {
      setShowError(true);
      toast({
        title: "Error",
        description: "Password salah",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.regularPrice || !newProduct.barcode) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon isi semua field yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProduct({
        name: newProduct.name,
        regularPrice: parseFloat(newProduct.regularPrice.replace(/\./g, "")),
        // Menetapkan nilai default untuk stok, karena field stok tidak diinputkan oleh pengguna
        stock: 100,
        image: "/placeholder.svg",
        barcode: newProduct.barcode, // Pastikan barcode sudah termasuk dalam tipe Product
      });

      setIsOpen(false);
      setNewProduct({
        name: "",
        regularPrice: "",
        barcode: "",
      });

      toast({
        title: "Produk ditambahkan",
        description: "Produk berhasil ditambahkan ke sistem",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan produk. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast({
        title: "Produk dihapus",
        description: "Produk berhasil dihapus dari sistem",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus produk. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Fungsi add-to-cart (jika diperlukan)
  const handleAddToCart = async (product: Product) => {
    if (product.stock > 0) {
      try {
        await updateProductStock(product.id, product.stock - 1);
        toast({
          title: "Sukses",
          description: "Produk berhasil ditambahkan ke keranjang",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan produk ke keranjang",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Stok produk habis",
        variant: "destructive",
      });
    }
  };

  const handlePriceBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, "");
    if (value) {
      const formattedValue = formatNumber(parseFloat(value));
      setNewProduct((prev) => ({ ...prev, regularPrice: formattedValue }));
    }
  };

  if (showVerification) {
    return (
      <AlertDialog open={showVerification}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verifikasi Akses</AlertDialogTitle>
            <AlertDialogDescription>
              {showError ? (
                <div className="text-center space-y-4">
                  <X className="mx-auto h-16 w-16 text-red-500" />
                  <p className="text-red-500 font-semibold">Password salah!</p>
                  <Button onClick={() => setShowError(false)} className="w-full">
                    Coba Lagi
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Pilih Rule</Label>
                    <select
                      className="w-full p-2 border rounded mt-1"
                      value={selectedRule}
                      onChange={(e) => setSelectedRule(e.target.value)}
                    >
                      <option value="">Pilih rule...</option>
                      {Object.keys(rules).map((rule) => (
                        <option key={rule} value={rule}>
                          {rules[rule].type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={verificationPassword}
                        onChange={(e) => setVerificationPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleVerify} className="w-full">
                    Verifikasi
                  </Button>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Produk Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Produk</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="regularPrice">Harga</Label>
                <Input
                  id="regularPrice"
                  value={newProduct.regularPrice}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      regularPrice: e.target.value,
                    })
                  }
                  onBlur={handlePriceBlur}
                />
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={newProduct.barcode}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, barcode: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleAddProduct} className="w-full">
                Tambah Produk
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ProductGrid
        products={products}
        onAddToCart={handleAddToCart}
        onDeleteProduct={handleDeleteProduct}
        showEditButton={true}
      />
    </div>
  );
};

export default Products;
