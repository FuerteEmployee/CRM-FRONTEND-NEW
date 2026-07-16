import { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileJson,
  FileType,
  Printer,
  RefreshCcw,
  Eye,
  EyeOff,
  Info
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/client";
import { customerService } from "@/api/services/customer.service";
import { formatDate } from "@/lib/dateFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { TableActions } from "@/components/TableActions";


const Contacts = () => {
  const [search, setSearch] = useState("");
  const [editContact, setEditContact] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 25;

  const { data: allContacts = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["all-contacts"],
    queryFn: () => apiClient.get("/clients/contacts/all").catch(() => []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/clients/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      toast({
        title: "Deleted",
        description: "Contact has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/clients/contacts/${data._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      setEditContact(null);
      toast({
        title: "Updated",
        description: "Contact has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const importFileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (data: any) => customerService.importContacts(data),
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      await queryClient.refetchQueries({ queryKey: ["all-contacts"] });
      toast({
        title: data.count === 0 ? "No New Contacts" : "Import Successful",
        description: data.message || "Contacts imported",
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  // Header-insensitive lookup: "First Name", "first_name", "FIRSTNAME " all match.
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
  const getField = (row: any, ...candidates: string[]) => {
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => { normalized[normalizeKey(k)] = row[k]; });
    for (const c of candidates) {
      const val = normalized[normalizeKey(c)];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    const processRows = (rows: any[]) => {
      const mapped = rows.map((r) => {
        let firstname = getField(r, "firstname", "first name", "fname");
        let lastname = getField(r, "lastname", "last name", "lname", "surname");
        // "Full Name" / "Name" column (what our own export produces) → split it
        if (!firstname) {
          const full = getField(r, "full name", "fullname", "name", "contact name");
          if (full) {
            const parts = full.split(/\s+/);
            firstname = parts.shift() || "";
            lastname = lastname || parts.join(" ");
          }
        }
        return {
          firstname,
          lastname,
          email: getField(r, "email", "e-mail", "email address", "mail").toLowerCase(),
          company: getField(r, "company", "company name", "customer/company", "customer company", "customer", "client"),
          phonenumber: getField(r, "phonenumber", "phone", "phone number", "mobile", "mobile number", "contact number"),
          title: getField(r, "title", "position", "designation", "job title", "role"),
        };
      });

      const valid = mapped.filter((r) => r.firstname && r.email && r.company);
      if (valid.length === 0) {
        const missing: string[] = [];
        if (!mapped.some((r) => r.firstname)) missing.push("'First Name' (or 'Full Name')");
        if (!mapped.some((r) => r.email)) missing.push("'Email'");
        if (!mapped.some((r) => r.company)) missing.push("'Company' (or 'Customer/Company')");
        toast({
          title: "Error",
          description: `No valid rows found. Missing column(s): ${missing.join(", ") || "check First Name, Email, Company"}. The company must match an existing customer.`,
          variant: "destructive",
        });
        return;
      }
      const dropped = mapped.length - valid.length;
      if (dropped > 0) {
        toast({ title: "Note", description: `${dropped} row(s) skipped — missing name, email, or company.` });
      }
      importMutation.mutate(valid as any);
    };

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          processRows(XLSX.utils.sheet_to_json(ws, { defval: "" }));
        } catch {
          toast({ title: "Parsing Error", description: "Could not read Excel file.", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data as any[]),
      });
    }
    e.target.value = "";
  };

  // Downloads an .xlsx template with the exact headers the import understands
  const handleDownloadTemplate = () => {
    const headers = ["First Name", "Last Name", "Email", "Company", "Phone", "Position"];
    const example = ["Amit", "Shah", "amit@example.com", "Existing Customer Name", "9876543210", "Manager"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "contacts_import_template.xlsx");
    toast({ title: "Template Downloaded", description: "Fill it and use Import. 'Company' must match an existing customer." });
  };

  const handlePermissionChange = (permission: string, type: "permissions" | "email_notifications") => {
    setEditContact((prev: any) => {
      const current = prev[type] || [];
      const updated = current.includes(permission)
        ? current.filter((p: string) => p !== permission)
        : [...current, permission];
      return { ...prev, [type]: updated };
    });
  };

  const filtered = allContacts.filter((contact) => {
    const fullName = `${contact.firstname || ""} ${contact.lastname || ""}`.toLowerCase();
    const companyName = (contact.userid?.company || "").toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      (contact.email || "").toLowerCase().includes(search.toLowerCase()) ||
      companyName.includes(search.toLowerCase())
    );
  }).sort((a, b) => {
    const companyA = (a.userid?.company || "").toLowerCase();
    const companyB = (b.userid?.company || "").toLowerCase();
    
    if (companyA !== companyB) {
      return companyA.localeCompare(companyB);
    }
    
    const nameA = `${a.firstname || ""} ${a.lastname || ""}`.toLowerCase();
    const nameB = `${b.firstname || ""} ${b.lastname || ""}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filtered.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Full Name", "Customer/Company", "Email", "Position", "Phone", "Active", "Last Login"];
      const rows = filtered.map((contact: any) => [
        `${contact.firstname || ""} ${contact.lastname || ""}`.trim(),
        contact.userid?.company || "-",
        contact.email || "",
        contact.title || "developer",
        contact.phonenumber || "-",
        contact.active ? "Yes" : "No",
        contact.last_login ? formatDate(contact.last_login) : "Never"
      ]);

      const filenameBase = `contacts_export_${new Date().toISOString().split('T')[0]}`;

      if (type === "xlsx") {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
      } else {
        const csvData = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob(["﻿" + csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filenameBase}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast({ title: "Success", description: `Exported successfully as ${type.toUpperCase()}` });
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
        </div>

        
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Select defaultValue="25">
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                {/* Import contacts from Excel / CSV */}
                <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 text-xs font-bold uppercase tracking-wider"
                  disabled={importMutation.isPending}
                  onClick={() => importFileRef.current?.click()}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {importMutation.isPending ? "Importing..." : "Import"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 text-xs font-bold uppercase tracking-wider"
                  onClick={handleDownloadTemplate}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                  Sample
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold uppercase tracking-wider">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-8 h-8 w-[200px] text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Position</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Active</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4 text-right">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={7} className="p-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-muted-foreground">
                        No contacts found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((contact) => (
                      <tr
                        key={contact._id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors group"
                      >
                        <td className="p-4">
                          <span className="text-sm font-bold text-[#334155]">
                            {contact.firstname} {contact.lastname}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-[#64748b]">
                            {contact.userid?.company || "-"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-[#64748b]">
                          {contact.email}
                        </td>
                        <td className="p-4 text-sm text-[#64748b]">
                          {contact.title || "developer"}
                        </td>
                        <td className="p-4 text-sm text-[#64748b]">
                          {contact.phonenumber || "-"}
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={contact.active}
                            onCheckedChange={(val) => updateMutation.mutate({ ...contact, active: val })}
                            className="scale-90 data-[state=checked]:bg-blue-600"
                          />
                        </td>
                        <td className="p-4 text-sm text-[#64748b]">
                          {contact.last_login ? formatDate(contact.last_login) : "Never"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end">
                            <TableActions
                              onEdit={() => setEditContact(contact)}
                              onDelete={() => deleteMutation.mutate(contact._id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground">
              <span>
                Showing 1 to {Math.min(itemsPerPage, filtered.length)} of{" "}
                {filtered.length} entries
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editContact} onOpenChange={(open) => !open && setEditContact(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Edit Contact</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-4 overflow-y-auto max-h-[70vh] px-1">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstname" className="text-[11px] font-bold uppercase text-muted-foreground">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstname"
                      value={editContact?.firstname || ""}
                      onChange={(e) => setEditContact({ ...editContact, firstname: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastname" className="text-[11px] font-bold uppercase text-muted-foreground">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastname"
                      value={editContact?.lastname || ""}
                      onChange={(e) => setEditContact({ ...editContact, lastname: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-[11px] font-bold uppercase text-muted-foreground">Position</Label>
                  <Input
                    id="title"
                    value={editContact?.title || ""}
                    onChange={(e) => setEditContact({ ...editContact, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-bold uppercase text-muted-foreground">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={editContact?.email || ""}
                    onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phonenumber" className="text-[11px] font-bold uppercase text-muted-foreground">Phone</Label>
                  <Input
                    id="phonenumber"
                    value={editContact?.phonenumber || ""}
                    onChange={(e) => setEditContact({ ...editContact, phonenumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Direction</Label>
                  <Select value={editContact?.direction || "ltr"} onValueChange={(v) => setEditContact({ ...editContact, direction: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ltr">LTR</SelectItem>
                      <SelectItem value="rtl">RTL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" title="Password" className="text-[11px] font-bold uppercase text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password"
                      value={editContact?.password || ""} 
                      onChange={(e) => setEditContact({ ...editContact, password: e.target.value })}
                      type={showPassword ? "text" : "password"} 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="is_primary" 
                      checked={editContact?.is_primary} 
                      onCheckedChange={(v) => setEditContact({ ...editContact, is_primary: v })} 
                    />
                    <Label htmlFor="is_primary" className="text-sm cursor-pointer">Primary Contact</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="donotsendwelcomeemail" 
                      checked={editContact?.donotsendwelcomeemail} 
                      onCheckedChange={(v) => setEditContact({ ...editContact, donotsendwelcomeemail: v })} 
                    />
                    <Label htmlFor="donotsendwelcomeemail" className="text-sm cursor-pointer">Do not send welcome email</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="send_set_password_email" 
                      checked={editContact?.send_set_password_email} 
                      onCheckedChange={(v) => setEditContact({ ...editContact, send_set_password_email: v })} 
                    />
                    <Label htmlFor="send_set_password_email" className="text-sm cursor-pointer">Send SET password email</Label>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Label className="text-[11px] font-bold uppercase text-primary tracking-wider">Permissions</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Appropriate permissions for this contact</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                    {["Invoices", "Estimates", "Contracts", "Proposals", "Support", "Projects"].map((p) => (
                      <div key={p} className="flex items-center gap-3">
                        <Checkbox 
                          id={`perm-${p}`} 
                          checked={(editContact?.permissions || []).includes(p)}
                          onCheckedChange={() => handlePermissionChange(p, "permissions")}
                        />
                        <Label htmlFor={`perm-${p}`} className="text-xs cursor-pointer">{p}</Label>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Label className="text-[11px] font-bold uppercase text-primary tracking-wider">Email Notifications</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                    {["Invoice", "Estimate", "Credit Note", "Project", "Tickets", "Task", "Contract"].map((n) => (
                      <div key={n} className="flex items-center gap-3">
                        <Checkbox 
                          id={`notif-${n}`}
                          checked={(editContact?.email_notifications || []).includes(n)}
                          onCheckedChange={() => handlePermissionChange(n, "email_notifications")}
                        />
                        <Label htmlFor={`notif-${n}`} className="text-xs cursor-pointer flex items-center gap-1.5">{n}</Label>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4 border-t">
              <Button variant="outline" onClick={() => setEditContact(null)}>
                Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate(editContact)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


    </DashboardLayout>
  );
};

export default Contacts;
