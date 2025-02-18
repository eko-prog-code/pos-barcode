import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UserRules } from "@/components/user/UserRules";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { X, Eye, EyeOff } from "lucide-react";

const Users = () => {
  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State untuk show/hide password
  const { toast } = useToast();
  const ADMIN_PASSWORD = "HezekiahEthan123";

  const handleVerify = () => {
    if (password === ADMIN_PASSWORD) {
      setIsVerified(true);
      setPassword("");
      toast({
        title: "Berhasil",
        description: "Verifikasi berhasil",
      });
    } else {
      setShowError(true);
      setPassword("");
    }
  };

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
                    Password salah. Anda tidak dapat mengakses!!!
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"} // Toggle type berdasarkan state showPassword
                      placeholder="Masukkan password"
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
      <h1 className="text-2xl font-bold mb-6">Manajemen User</h1>
      <div className="max-w-md space-y-4">
        <UserRules />
      </div>
    </div>
  );
};

export default Users;
