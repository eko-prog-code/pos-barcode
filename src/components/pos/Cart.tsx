import { useEffect, useState } from "react";
import { ref, update, remove, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Minus,
  Plus,
  Trash2,
  X,
  Printer,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatIDR } from "@/lib/currency";
import { createSale } from "@/services/saleService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { CartItem, Sale } from "@/types/pos";

const Cart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const [amountPaid, setAmountPaid] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showBuyerForm, setShowBuyerForm] = useState(false);

  // 1) Ambil data cart secara realtime dari Firebase
  useEffect(() => {
    const itemsRef = ref(db, "cart/global/items");
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Pastikan field price disimpan sebagai number. Jika string, parseFloat.
        const itemsArray: CartItem[] = Object.keys(data).map((key) => {
          const raw = data[key];
          return {
            id: raw.id || key,
            name: raw.name,
            barcode: raw.barcode,
            quantity: raw.quantity,
            // Jika raw.price ter-serialize sebagai string, kita pakai parseFloat:
            price:
              typeof raw.price === "string"
                ? parseFloat(raw.price)
                : raw.price,
          } as CartItem;
        });
        setItems(itemsArray);
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2) Update quantity di cart
  const onUpdateQuantity = async (productId: string, newQuantity: number) => {
    try {
      const itemRef = ref(db, `cart/global/items/${productId}`);
      await update(itemRef, { quantity: newQuantity });

      // Perbarui state lokal
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );

      toast({ title: "Quantity berhasil diperbarui" });
    } catch (error) {
      toast({
        title: "Gagal memperbarui quantity",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  // 3) Hapus satu item dari cart
  const onRemoveItem = async (productId: string) => {
    try {
      const itemRef = ref(db, `cart/global/items/${productId}`);
      await remove(itemRef);

      // Perbarui state lokal
      setItems((prevItems) => prevItems.filter((item) => item.id !== productId));

      toast({ title: "Item berhasil dihapus" });
    } catch (error) {
      toast({ title: "Gagal menghapus item", variant: "destructive" });
      console.error(error);
    }
  };

  // 4) Kosongkan keseluruhan cart
  const onClearCart = async () => {
    try {
      const cartRef = ref(db, "cart/global/items");
      await remove(cartRef);

      // Perbarui state lokal
      setItems([]);

      toast({ title: "Cart berhasil dikosongkan" });
    } catch (error) {
      toast({ title: "Gagal mengosongkan cart", variant: "destructive" });
      console.error(error);
    }
  };

  // 5) Hitung subtotal: pastikan jangan sampai NaN
  const subtotal = items.reduce((sum, item) => {
    const unitPrice = isNaN(item.price) ? 0 : item.price;
    const qty = isNaN(item.quantity) ? 0 : item.quantity;
    return sum + unitPrice * qty;
  }, 0);

  // 6) Saat user mengetik angka kuantitas secara manual
  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity > 0) {
      onUpdateQuantity(productId, quantity);
    }
  };

  // 7) Format input jumlah bayar agar otomatis menjadi "1.000", "10.000", dsb.
  const handleNumberBlur = (value: string, setter: (value: string) => void) => {
    const number = parseFloat(value.replace(/[,.]/g, ""));
    if (!isNaN(number)) {
      setter(number.toLocaleString("id-ID"));
    } else {
      setter("0");
    }
  };

  // 8) Fungsi untuk mencetak struk (print)
  const handlePrintReceipt = () => {
    const printContent = document.getElementById("receipt-content");
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // reload agar React kembali normal
    }
  };

  // 9) Kirim struk ke WhatsApp
  const handleSendToWhatsApp = () => {
    const paidNumeric = parseFloat(amountPaid.replace(/[,.]/g, "")) || 0;
    const changeNumeric = Math.max(paidNumeric - subtotal, 0);

    const trimmedNumber = whatsappNumber.trim();
    const formattedWhatsappNumber = trimmedNumber.startsWith("0")
      ? "62" + trimmedNumber.substring(1)
      : trimmedNumber;

    const receiptText = `
*Receipt Details*
Buyer: ${buyerName}
Date: ${new Date().toLocaleDateString("id-ID")}
Time: ${new Date().toLocaleTimeString("id-ID")}

*Items:*
${items
  .map(
    (item) =>
      `${item.name} x ${item.quantity} = ${formatIDR(
        item.price * item.quantity
      )}`
  )
  .join("\n")}

*Total:* ${formatIDR(subtotal)}
*Paid:* ${formatIDR(paidNumeric)}
*Change:* ${formatIDR(changeNumeric)}
    `.trim();

    const whatsappUrl = `https://wa.me/${formattedWhatsappNumber.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(receiptText)}`;
    window.open(whatsappUrl, "_blank");
  };

  // 10) Selesaikan transaksi: simpan ke koleksi sales
  const handleCompleteSale = async () => {
    const paidAmount = parseFloat(amountPaid.replace(/[,.]/g, "")) || 0;
    if (!amountPaid || paidAmount < subtotal) {
      toast({
        title: "Jumlah pembayaran tidak valid",
        description: "Mohon masukkan jumlah pembayaran yang valid",
        variant: "destructive",
      });
      return;
    }

    if (!buyerName || !whatsappNumber) {
      toast({
        title: "Data pembeli tidak lengkap",
        description: "Mohon lengkapi nama pembeli dan nomor WhatsApp",
        variant: "destructive",
      });
      return;
    }

    const change = paidAmount - subtotal;

    const saleData: Omit<Sale, "id"> = {
      date: new Date().toISOString(),
      items: items,
      total: subtotal,
      amountPaid: paidAmount,
      change: change,
      buyerName,
      whatsappNumber,
    };

    try {
      await createSale(saleData);
      setShowReceipt(true);
      toast({
        title: "Transaksi berhasil!",
        description: `Kembalian: ${formatIDR(change)}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan transaksi",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  // 11) Tutup struk (modal) dan clear cart
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    onClearCart();
    setAmountPaid("");
  };

  // 12) Hitung kembalian untuk ditampilkan di UI
  const paidAmountNum = parseFloat(amountPaid.replace(/[,.]/g, "")) || 0;
  const difference = paidAmountNum - subtotal;

  return (
    <>
      <div className="w-full md:w-96 bg-white border-l shadow-lg flex flex-col slide-in">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold">Penjualan</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearCart}
            className="hover:bg-primary/90"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* List Item di Cart */}
        <div className="flex-1 overflow-auto p-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b"
            >
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatIDR(item.price)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onUpdateQuantity(item.id, item.quantity - 1)
                  }
                  disabled={item.quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleQuantityChange(item.id, e.target.value)
                  }
                  className="w-16 text-center"
                  min="1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onUpdateQuantity(item.id, item.quantity + 1)
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Jika keranjang kosong */}
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Keranjang kosong
            </p>
          )}
        </div>

        {/* Bagian Total, Input Bayar, Kembalian, dan Tombol Selesaikan */}
        <div className="p-4 border-t bg-muted">
          {/* Toggle form pembeli */}
          <div
            className="flex items-center justify-center cursor-pointer select-none"
            onClick={() => setShowBuyerForm((prev) => !prev)}
          >
            {showBuyerForm ? (
              <div className="flex items-center space-x-1">
                <ChevronUp className="w-6 h-6 animate-pulse" />
                <span className="text-sm font-semibold">Sembunyikan Form</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <ChevronDown className="w-6 h-6 animate-pulse" />
                <span className="text-sm font-semibold">Tampilkan Form</span>
              </div>
            )}
          </div>

          {/* Form input nama & WA pembeli */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              showBuyerForm ? "max-h-[200px] mt-4" : "max-h-0"
            }`}
          >
            <div className="space-y-4">
              <div>
                <Label>Nama Pembeli</Label>
                <Input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Masukkan nama pembeli"
                  className="mb-2"
                />
                <Label>Nomor WhatsApp</Label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="mb-4"
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between mb-4">
            <span className="font-bold">Total:</span>
            <span className="font-bold">{formatIDR(subtotal)}</span>
          </div>

          {/* Input Jumlah Bayar */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Jumlah Bayar
            </label>
            <Input
              type="text"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              onBlur={(e) => handleNumberBlur(e.target.value, setAmountPaid)}
              placeholder="Masukkan jumlah"
              className="w-full"
            />
          </div>

          {/* Kembalian */}
          <div className="flex justify-between text-sm mb-4">
            <span>Kembalian:</span>
            <span
              className={difference < 0 ? "text-red-500 font-bold" : "font-bold"}
            >
              {formatIDR(Math.max(difference, 0))}
            </span>
          </div>

          {/* Tombol Selesaikan Transaksi */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCompleteSale}
            disabled={items.length === 0}
          >
            Selesaikan Transaksi
          </Button>
        </div>
      </div>

      {/* Modal Struk Penjualan */}
      <Dialog open={showReceipt} onOpenChange={handleCloseReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Struk Penjualan</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSendToWhatsApp}
                  className="ml-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrintReceipt}
                  className="ml-2"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </DialogDescription>
          </DialogHeader>

          <div id="receipt-content" className="space-y-4">
            <div className="space-y-2">
              <p>
                <strong>Pembeli:</strong> {buyerName}
              </p>
              <p>
                <strong>WhatsApp:</strong> {whatsappNumber}
              </p>
            </div>
            <div className="border-t border-b py-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-1">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>{formatIDR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Bayar</span>
              <span>{formatIDR(paidAmountNum)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembalian</span>
              <span
                className={difference < 0 ? "text-red-500 font-bold" : "font-bold"}
              >
                {formatIDR(Math.max(difference, 0))}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Cart;
