import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, X, Eye, EyeOff, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sale } from "@/types/pos";
import { subscribeToSales, deleteSale } from "@/services/saleService";
import { formatIDR } from "@/lib/currency";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";

const Sales = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [showError, setShowError] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRule, setSelectedRule] = useState("");
  const [rules, setRules] = useState<Record<string, any>>({});
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRules = async () => {
      const rulesRef = ref(db, 'rules');
      const snapshot = await get(rulesRef);
      if (snapshot.exists()) {
        setRules(snapshot.val());
      }
    };
    fetchRules();
  }, []);

  const handleDeleteSale = async () => {
    if (saleToDelete) {
      try {
        await deleteSale(saleToDelete);
        setSaleToDelete(null);
        toast({
          title: "Berhasil",
          description: "Data penjualan berhasil dihapus",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal menghapus data penjualan",
          variant: "destructive",
        });
      }
    }
  };

  const handleVerify = () => {
    const selectedRuleData = rules[selectedRule];
    if (selectedRuleData && selectedRuleData.password === password) {
      setIsVerified(true);
      setPassword("");
      toast({
        title: "Berhasil",
        description: "Verifikasi berhasil",
      });
    } else {
      setShowError(true);
      setPassword("");
      toast({
        title: "Error",
        description: "Password salah",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isVerified) {
      const unsubscribe = subscribeToSales((salesData) => {
        const sortedSales = [...salesData].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setSales(sortedSales);
      });

      return () => unsubscribe();
    }
  }, [isVerified]);

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    return (
      saleDate.getDate() === date.getDate() &&
      saleDate.getMonth() === date.getMonth() &&
      saleDate.getFullYear() === date.getFullYear()
    );
  });

  // Calculate total daily sales
  const totalDailySales = filteredSales.reduce((total, sale) => total + sale.total, 0);

  if (!isVerified) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verifikasi Akses</AlertDialogTitle>
            <AlertDialogDescription>
              {showError ? (
                <div className="text-center space-y-4">
                  <X className="mx-auto h-16 w-16 text-red-500" />
                  <p className="text-red-500 font-semibold">
                    Password salah!
                  </p>
                  <Button 
                    onClick={() => setShowError(false)} 
                    className="w-full"
                  >
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Riwayat Penjualan</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pilih tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Total Penjualan Harian: {formatIDR(totalDailySales)}
        </h2>
      </div>

      {filteredSales.length > 0 ? (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-white p-4 rounded-lg shadow space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {new Date(sale.date).toLocaleString("id-ID")}
                  </p>
                  <p className="font-medium mt-1">
                    Pembeli: {sale.buyerName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp: {sale.whatsappNumber}
                  </p>
                  <div className="mt-2 space-y-1">
                    {sale.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="text-muted-foreground">
                          {formatIDR(item.regularPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setSaleToDelete(sale.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatIDR(sale.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Dibayar</span>
                  <span>{formatIDR(sale.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Kembalian</span>
                  <span>{formatIDR(sale.change)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground">
          Tidak ada transaksi penjualan untuk ditampilkan.
        </div>
      )}

      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data penjualan ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Tidak</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;
