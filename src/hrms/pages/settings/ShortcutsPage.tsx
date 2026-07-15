import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { Input } from "@/hrms/components/ui/input";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { 
  Keyboard, 
  Search, 
  ShoppingCart, 
  ShoppingBag, 
  CreditCard, 
  Boxes, 
  ClipboardList,
  ExternalLink,
  Info,
  ArrowLeft
} from "lucide-react";

interface ShortcutItem {
  keyCombo: string;
  action: string;
  route: string;
  category: "sales" | "purchase" | "accounts" | "stock" | "masters";
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // Sales
  { keyCombo: "F2", action: "New Sales Invoice", route: "/sales/sales-invoice/new", category: "sales" },
  { keyCombo: "Alt + F2", action: "New Sales Return", route: "/sales/sales-return/new", category: "sales" },
  { keyCombo: "Alt + E", action: "New Sales Order", route: "/sales/sales-order/new", category: "sales" },
  { keyCombo: "Alt + M", action: "New Sales DC", route: "/sales/sales-dc/new", category: "sales" },
  { keyCombo: "Alt + Q", action: "New Quotation", route: "/sales/quotation/new", category: "sales" },
  
  // Purchase
  { keyCombo: "Alt + B", action: "New Purchase Bill", route: "/purchase/purchase-bill/new", category: "purchase" },
  { keyCombo: "Alt + D", action: "New Purchase DC", route: "/purchase/purchase-dc/new", category: "purchase" },
  { keyCombo: "Alt + O", action: "New Purchase Order", route: "/purchase/purchase-order/new", category: "purchase" },
  { keyCombo: "Alt + R", action: "New Purchase Return", route: "/purchase/purchase-return/new", category: "purchase" },
  
  // Accounts
  { keyCombo: "F8", action: "New Payment Voucher", route: "/accounts/payments/new", category: "accounts" },
  { keyCombo: "Alt + F8", action: "New Journal Voucher", route: "/accounts/journals/new", category: "accounts" },
  { keyCombo: "F9", action: "New Receipt Voucher", route: "/accounts/receipts/new", category: "accounts" },
  { keyCombo: "Alt + F9", action: "New Contra Voucher", route: "/accounts/contra/new", category: "accounts" },
  
  // Internal Stock
  { keyCombo: "Alt + I", action: "New Internal Stock Order", route: "/internal-stock/order/new", category: "stock" },
  { keyCombo: "Alt + T", action: "New Internal Stock Transfer", route: "/internal-stock/transfer/new", category: "stock" },
  { keyCombo: "Alt + K", action: "New Acknowledge of STN", route: "/internal-stock/acknowledge/new", category: "stock" },
  
  // Masters
  { keyCombo: "Alt + G", action: "Item / Model Directory", route: "/masters/items", category: "masters" }
];

const CATEGORIES = [
  { value: "all", label: "All Shortcuts", icon: Keyboard },
  { value: "sales", label: "Sales & Billing", icon: ShoppingCart },
  { value: "purchase", label: "Purchase", icon: ShoppingBag },
  { value: "accounts", label: "Accounts & Finance", icon: CreditCard },
  { value: "stock", label: "Internal Stock", icon: Boxes },
  { value: "masters", label: "Masters", icon: ClipboardList }
];

export default function ShortcutsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS_DATA.filter((s) => {
      const matchesSearch = 
        s.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.keyCombo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "all" || s.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <PageHeader
        title="Keyboard Shortcuts"
        subtitle="Quick access keys to create transactions and navigate the ERP system instantly from anywhere"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings")}
            className="rounded-md border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all px-4 h-9 font-medium text-xs flex items-center gap-2 text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-primary" /> Back to Settings
          </Button>
        }
      />

      {/* Info notice bar */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Pro Tip: </span>
          These shortcuts are global and can be triggered at any time. When typing in an input field, only <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-mono font-bold shadow-sm">F2</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-mono font-bold shadow-sm">F8</kbd>, and <kbd className="px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-xs font-mono font-bold shadow-sm">F9</kbd> (and their Alt-combinations) are enabled to prevent navigation while typing values.
        </div>
      </div>

      {/* Search and filter toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-all" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action name or key (e.g. 'F2' or 'Purchase')..."
            className="h-11 pl-11 w-full border-slate-200 bg-white/50 backdrop-blur-md rounded-xl"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl max-w-fit">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant="ghost"
            onClick={() => setSelectedCategory(cat.value)}
            className={`rounded-lg font-bold px-4 py-2 gap-2 text-xs transition-all h-9 ${
              selectedCategory === cat.value
                ? "bg-white text-primary shadow-sm hover:bg-white"
                : "text-slate-600 hover:bg-white/40"
            }`}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Grid of shortcuts */}
      {filteredShortcuts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShortcuts.map((s, idx) => {
            const keys = s.keyCombo.split("+").map(k => k.trim());
            return (
              <Card key={idx} className="glass border-slate-200 shadow-soft overflow-hidden hover:border-primary/30 transition-all group duration-300">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                  <Badge variant="outline" className={`capitalize font-bold text-[10px] tracking-wider px-2 py-0.5 ${
                    s.category === 'sales' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    s.category === 'purchase' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    s.category === 'accounts' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    s.category === 'stock' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    {s.category === 'stock' ? 'Internal Stock' : s.category}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => navigate(s.route)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all rounded-lg"
                    title={`Go to ${s.action}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-extrabold text-[#1a1a1a] text-[15px]">{s.action}</p>
                    <p className="text-xs text-slate-500 font-medium cursor-pointer hover:underline" onClick={() => navigate(s.route)}>
                      Navigate to page
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {keys.map((key, kIdx) => (
                      <span key={kIdx} className="flex items-center gap-1">
                        {kIdx > 0 && <span className="text-slate-400 font-bold text-xs">+</span>}
                        <kbd className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[#1a1a1a] text-xs font-mono font-black shadow-sm flex items-center justify-center min-w-[2.25rem]">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <Keyboard className="h-12 w-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800 text-lg">No shortcuts found</p>
            <p className="text-sm text-slate-500">Try adjusting your search keywords or filter category.</p>
          </div>
        </div>
      )}
    </div>
  );
}
