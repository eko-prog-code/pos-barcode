// pages/StockStatus.tsx
import { useEffect, useState } from "react";
import { ref, get, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface StockInfo {
  barcode: string;
  name: string;
  stokAwal: number;
  totalTerjual: number;
  sisaStok: number;
}

const StockStatus = () => {
  const { toast } = useToast();

  // ------------- PASSWORD VERIFICATION STATE -------------
  const [showVerification, setShowVerification] = useState(true);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [selectedRule, setSelectedRule] = useState("");
  const [rules, setRules] = useState<Record<string, { type: string; password: string }>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);

  // ------------- RAW PRODUCT & SALES STATE -------------
  const [rawProducts, setRawProducts] = useState<
    Record<string, { name: string; stock: number; barcode: string }>
  >({});
  const [sales, setSales] = useState<Record<string, any>>({});
  const [productsByBarcode, setProductsByBarcode] = useState<
    Record<string, { name: string; stock: number }>
  >({});
  const [stockStatus, setStockStatus] = useState<StockInfo[]>([]);

  // ------------- FILTER & FORM STATE -------------
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    barcode: "",
    stock: "",
  });
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState("");

  // 1. Fetch rules for verification
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

  // 2. Handle password verification
  const handleVerify = () => {
    const selectedRuleData = rules[selectedRule];
    if (selectedRuleData && selectedRuleData.password === verificationPassword) {
      setShowVerification(false);
      setShowError(false);
      toast({ title: "Berhasil", description: "Verifikasi berhasil" });
    } else {
      setShowError(true);
      toast({ title: "Error", description: "Password salah", variant: "destructive" });
    }
  };

  // 3. Fetch rawProducts & sales from Firebase
  const fetchData = async () => {
    const productsSnap = await get(ref(db, "products"));
    const salesSnap = await get(ref(db, "sales"));
    const productsData = productsSnap.exists() ? productsSnap.val() : {};
    const salesData = salesSnap.exists() ? salesSnap.val() : {};
    setRawProducts(productsData);
    setSales(salesData);
  };

  useEffect(() => {
    if (!showVerification) {
      fetchData();
    }
  }, [showVerification]);

  // 4. Transform rawProducts → productsByBarcode
  useEffect(() => {
    const byBarcode: Record<string, { name: string; stock: number }> = {};
    Object.values(rawProducts).forEach((prod: any) => {
      if (prod.barcode) {
        byBarcode[prod.barcode] = {
          name: prod.name,
          stock: prod.stock,
        };
      }
    });
    setProductsByBarcode(byBarcode);
  }, [rawProducts]);

  // 5. Compute stockStatus from productsByBarcode & sales
  useEffect(() => {
    const stockData: StockInfo[] = [];
    Object.entries(productsByBarcode).forEach(([barcode, productObj]) => {
      let totalSold = 0;
      Object.values(sales).forEach((sale: any) => {
        if (sale.items) {
          const itemsArray = Object.values(sale.items);
          itemsArray.forEach((item: any) => {
            if (item.barcode === barcode) {
              totalSold += item.quantity !== undefined ? item.quantity : 1;
            }
          });
        }
      });
      const stokAwal = productObj.stock ?? 0;
      const sisaStok = stokAwal - totalSold;
      stockData.push({
        barcode,
        name: productObj.name,
        stokAwal,
        totalTerjual: totalSold,
        sisaStok,
      });
    });
    setStockStatus(stockData);
  }, [productsByBarcode, sales]);

  // 6. Add new product to Firebase
  const handleAddProduct = async () => {
    const { name, barcode, stock } = addFormData;
    if (!name.trim() || !barcode.trim() || !stock.trim()) {
      toast({ title: "Data tidak lengkap", description: "Isi semua field", variant: "destructive" });
      return;
    }
    const stokNum = parseInt(stock);
    if (isNaN(stokNum) || stokNum < 0) return;
    await set(ref(db, `products/${barcode}`), {
      name: name.trim(),
      stock: stokNum,
      barcode: barcode.trim(),
    });
    setAddFormData({ name: "", barcode: "", stock: "" });
    setShowAddForm(false);
    fetchData();
  };

  // 7. Delete product by finding its push-ID key in rawProducts
  const handleDeleteProduct = async (barcode: string) => {
    const entry = Object.entries(rawProducts).find(
      ([pushId, prod]) => prod.barcode === barcode
    );
    if (!entry) return;
    const [keyToDelete] = entry;
    await remove(ref(db, `products/${keyToDelete}`));
    fetchData();
  };

  // 8. Start editing stock
  const startEditStock = (barcode: string, currentStock: number) => {
    setEditingBarcode(barcode);
    setEditStockValue(currentStock.toString());
  };

  // 9. Save edited stock to Firebase
  const handleSaveEdit = async (barcode: string) => {
    const stokNum = parseInt(editStockValue);
    if (isNaN(stokNum) || stokNum < 0) return;
    const entry = Object.entries(rawProducts).find(
      ([pushId, prod]) => prod.barcode === barcode
    );
    if (!entry) return;
    const [keyToUpdate] = entry;
    await update(ref(db, `products/${keyToUpdate}`), { stock: stokNum });
    setEditingBarcode(null);
    setEditStockValue("");
    fetchData();
  };

  const cancelEdit = () => {
    setEditingBarcode(null);
    setEditStockValue("");
  };

  // 10. Filter & sort stockStatus
  const filteredAndSorted = stockStatus
    .filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const rank = (x: StockInfo) => {
        if (x.sisaStok <= 0) return 0;
        if (x.sisaStok < 2) return 1;
        return 2;
      };
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  // ------------- RENDER PASSWORD MODAL IF NEEDED -------------
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
                      {Object.keys(rules).map((ruleKey) => (
                        <option key={ruleKey} value={ruleKey}>
                          {rules[ruleKey].type}
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

  // ------------- RENDER STOCK STATUS UI -------------
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Status Sisa Stok</h1>

      {/* Filter + tombol tambah */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <Input
          placeholder="Cari nama produk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/2 mb-4 sm:mb-0"
        />
        <Button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="flex items-center gap-1"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? "Tutup Form" : "Tambah Produk"}</span>
        </Button>
      </div>

      {/* Form Tambah Produk */}
      {showAddForm && (
        <div className="bg-gray-100 p-4 rounded-xl shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <Input
              placeholder="Nama Produk"
              value={addFormData.name}
              onChange={(e) =>
                setAddFormData({ ...addFormData, name: e.target.value })
              }
            />
            <Input
              placeholder="Barcode"
              value={addFormData.barcode}
              onChange={(e) =>
                setAddFormData({ ...addFormData, barcode: e.target.value })
              }
            />
            <Input
              placeholder="Stok Awal"
              type="number"
              value={addFormData.stock}
              onChange={(e) =>
                setAddFormData({ ...addFormData, stock: e.target.value })
              }
            />
          </div>
          <Button onClick={handleAddProduct}>Simpan Produk</Button>
        </div>
      )}

      {/* Daftar Card Stok */}
      <div className="space-y-4">
        {filteredAndSorted.map((item) => (
          <Card key={item.barcode} className="p-4 space-y-2 relative">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Barcode: {item.barcode}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Tombol edit stok */}
                {editingBarcode === item.barcode ? (
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={editStockValue}
                      onChange={(e) => setEditStockValue(e.target.value)}
                      className="w-20"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleSaveEdit(item.barcode)}
                    >
                      ✔
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      startEditStock(item.barcode, item.stokAwal)
                    }
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}

                {/* Tombol delete */}
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDeleteProduct(item.barcode)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p>Stok Awal: {item.stokAwal}</p>
              <p>Total Terjual: {item.totalTerjual}</p>
              <p
                className={`font-bold ${
                  item.sisaStok <= 5 ? "text-red-500" : "text-green-600"
                }`}
              >
                Sisa Stok: {item.sisaStok}
              </p>
            </div>
          </Card>
        ))}

        {filteredAndSorted.length === 0 && (
          <p className="text-muted-foreground">Tidak ada produk sesuai filter.</p>
        )}
      </div>
    </div>
  );
};

export default StockStatus;
