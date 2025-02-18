import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { X, Eye, EyeOff } from "lucide-react";

interface Rule {
  type: string;
  password: string;
}

export function UserRules() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ruleType, setRuleType] = useState("");
  const [rules, setRules] = useState<Record<string, Rule>>({});
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

  const handleAddRule = async () => {
    if (!ruleType || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const rulesRef = ref(db, 'rules');
      const newRule = {
        type: ruleType,
        password: password
      };

      await set(ref(db, `rules/${ruleType}`), newRule);

      setRules(prev => ({
        ...prev,
        [ruleType]: newRule
      }));

      setIsOpen(false);
      setPassword("");
      setRuleType("");

      toast({
        title: "Berhasil",
        description: "Rule berhasil ditambahkan",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan rule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleType: string) => {
    try {
      await remove(ref(db, `rules/${ruleType}`));
      
      const newRules = { ...rules };
      delete newRules[ruleType];
      setRules(newRules);

      toast({
        title: "Berhasil",
        description: "Rule berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus rule",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            Pilih Rules
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Rule Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipe Rule</Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button onClick={handleAddRule} className="w-full">
              Tambah Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {Object.entries(rules).map(([key, rule]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rule: {rule.type}</p>
                <p className="text-sm text-gray-500">Password: {rule.password}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteRule(key)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}