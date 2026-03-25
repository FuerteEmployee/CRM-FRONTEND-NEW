import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/api/services/finance.service";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Star } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Currency {
  _id: string;
  name: string;
  symbol: string;
  decimal_separator: string;
  thousand_separator: string;
  placement: "before" | "after";
  isdefault: boolean;
}

export default function SetupCurrencies() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState<Omit<Currency, "_id">>({
    name: "",
    symbol: "",
    decimal_separator: ".",
    thousand_separator: ",",
    placement: "before",
    isdefault: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currencies = [], isLoading } = useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => financeService.createCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: "Success", description: "Currency created successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeService.updateCurrency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: "Success", description: "Currency updated successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.deleteCurrency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: "Success", description: "Currency deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setCurrentCurrency(null);
    setFormData({
      name: "",
      symbol: "",
      decimal_separator: ".",
      thousand_separator: ",",
      placement: "before",
      isdefault: false,
    });
    setIsOpen(true);
  };

  const handleEdit = (currency: Currency) => {
    setCurrentCurrency(currency);
    setFormData({
      name: currency.name,
      symbol: currency.symbol,
      decimal_separator: currency.decimal_separator,
      thousand_separator: currency.thousand_separator,
      placement: currency.placement,
      isdefault: currency.isdefault,
    });
    setIsOpen(true);
  };

  const handleDelete = (currency: Currency) => {
    if (window.confirm("Are you sure you want to delete this currency?")) {
      deleteMutation.mutate(currency._id);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.symbol) {
      toast({
        title: "Error",
        description: "Currency Code and Symbol are required",
        variant: "destructive",
      });
      return;
    }

    if (currentCurrency) {
      updateMutation.mutate({ id: currentCurrency._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const makeDefault = (currency: Currency) => {
    updateMutation.mutate({ id: currency._id, data: { ...currency, isdefault: true } });
  };

  return (
    <>
      <DataTablePage
        title="Currencies"
        subtitle="Manage the currencies available for your business."
        addLabel="Add New Currency"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderCustomActions={(currency: Currency) => (
          !currency.isdefault && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
              onClick={() => makeDefault(currency)}
              title="Set as Base Currency"
            >
              <Star className="h-4 w-4" />
            </Button>
          )
        )}
        columns={[
          { 
            key: "name", 
            label: "Name",
            render: (row: Currency) => (
              <div>
                <div className="font-bold text-[#1e293b]">{row.name}</div>
                {row.isdefault && (
                  <div className="text-[11px] text-primary font-bold mt-0.5 uppercase tracking-wider">
                    Base Currency
                  </div>
                )}
              </div>
            )
          },
          { key: "symbol", label: "Symbol" },
        ]}
        data={currencies}
        isLoading={isLoading}
        idField="_id"
        showIdColumn={false}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-[#1e293b]">
                {currentCurrency ? "Edit Currency" : "Add New Currency"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-amber-800 font-medium">
                  Make sure to enter valid currency ISO code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-red-500">*</span> Currency Code
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 3);
                      setFormData({ ...formData, name: value });
                    }}
                    placeholder="ISO Code"
                    className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Please enter no more than 3 characters (e.g., USD, EUR).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-red-500">*</span> Symbol
                  </Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="Symbol"
                    className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-red-500">*</span> Decimal Separator
                  </Label>
                  <Select
                    value={formData.decimal_separator}
                    onValueChange={(val) => setFormData({ ...formData, decimal_separator: val })}
                  >
                    <SelectTrigger className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg">
                      <SelectValue placeholder="." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=".">.</SelectItem>
                      <SelectItem value=",">,</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-red-500">*</span> Thousand Separator
                  </Label>
                  <Select
                    value={formData.thousand_separator}
                    onValueChange={(val) => setFormData({ ...formData, thousand_separator: val })}
                  >
                    <SelectTrigger className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg">
                      <SelectValue placeholder="," />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">,</SelectItem>
                      <SelectItem value=".">.</SelectItem>
                      <SelectItem value="'">'</SelectItem>
                      <SelectItem value=" ">Space</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Currency Placement
                </Label>
                <RadioGroup
                  value={formData.placement}
                  onValueChange={(val: any) => setFormData({ ...formData, placement: val })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="before" />
                    <Label htmlFor="before" className="font-medium">Before Amount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after" className="font-medium">After Amount</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50/50 border-t gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6 h-10 border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg transition-all"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-8 h-10 bg-[#1e293b] hover:bg-[#334155] text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
