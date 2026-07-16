import React from "react";
import { Search, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/hrms/components/ui/select";
import { Label } from "@/hrms/components/ui/label";
import { cn } from "@/hrms/lib/utils";
import { StateSelect, CitySelect } from "@/hrms/components/common/LocationSelector";
import { useStore } from "@/hrms/contexts/StoreContext";

interface ListFiltersProps {
    onSearch?: (filters: any) => void;
    onReset?: () => void;
    isLoading?: boolean;
}

export function ListFilters({ onSearch, onReset, isLoading }: ListFiltersProps) {
    const { stores, selectedStoreId } = useStore();
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = React.useState(today);
    const [toDate, setToDate] = React.useState(today);
    const [location, setLocation] = React.useState({ state: "all", city: "all" });
    const [localBranchId, setLocalBranchId] = React.useState(selectedStoreId);

    // Sync with global store ID on initial load or if global changes
    React.useEffect(() => {
        setLocalBranchId(selectedStoreId);
    }, [selectedStoreId]);

    const handleSearch = () => {
        if (onSearch) {
            onSearch({
                branchId: localBranchId,
                startDate: fromDate,
                endDate: toDate,
                // Add other filters as needed
            });
        }
    };

    const handleReset = () => {
        setLocation({ state: "all", city: "all" });
        setFromDate(today);
        setToDate(today);
        setLocalBranchId(selectedStoreId);
        if (onReset) onReset();
    };

    // Auto search when branch changes
    React.useEffect(() => {
        if (localBranchId) {
            handleSearch();
        }
    }, [localBranchId]);

    return (
        <div className="glass-deep rounded-2xl border border-border/40 p-5 shadow-soft animate-fade-in space-y-5 bg-white/50 backdrop-blur-sm">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Branch</Label>
                    <Select value={localBranchId} onValueChange={setLocalBranchId}>
                        <SelectTrigger className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold">
                            <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                            <SelectItem value="all">All Branches</SelectItem>
                            {stores.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Document Type</Label>
                    <Select defaultValue="all">
                        <SelectTrigger className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="order">Sales Order</SelectItem>
                            <SelectItem value="invoice">Sales Invoice</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Period From Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            type="date" 
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-inherit border-slate-200 focus-visible:ring-primary/20 text-xs font-semibold" 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Period To Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            type="date" 
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-inherit border-slate-200 focus-visible:ring-primary/20 text-xs font-semibold" 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Party Type</Label>
                    <Select defaultValue="all">
                        <SelectTrigger className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold">
                            <SelectValue placeholder="Select Party Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                            <SelectItem value="all">All Parties</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="dealer">Dealer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">State Selection</Label>
                    <StateSelect 
                        value={location.state} 
                        onValueChange={(val: string) => setLocation({ state: val, city: "all" })}
                        allOption={true}
                        className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">City Selection</Label>
                    <CitySelect 
                        stateName={location.state}
                        value={location.city} 
                        onValueChange={(val: string) => setLocation({ ...location, city: val })}
                        allOption={true}
                        className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Status</Label>
                    <Select defaultValue="all">
                        <SelectTrigger className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold">
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Document Number</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search Doc No..." className="pl-9 h-10 rounded-xl bg-inherit border-slate-200 focus-visible:ring-primary/20 text-xs font-semibold" />
                    </div>
                </div>

                <div className="md:col-span-2 flex items-end gap-2">
                    <div className="space-y-1.5 flex-1">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Order By</Label>
                        <Select defaultValue="date_desc">
                            <SelectTrigger className="h-10 rounded-xl bg-inherit border-slate-200 focus:ring-primary/20 text-xs font-semibold">
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl bg-white">
                                <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                                <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                                <SelectItem value="amount_desc">Amount (Highest First)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        size="icon" 
                        className="h-10 w-10 shrink-0 rounded-xl gradient-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                        onClick={handleSearch}
                    >
                        <Search className="h-4.5 w-4.5" />
                    </Button>
                    <Button 
                        variant="outline"
                        size="icon" 
                        className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95"
                        onClick={handleReset}
                    >
                        <RefreshCw className={cn("h-4.5 w-4.5 text-muted-foreground", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
