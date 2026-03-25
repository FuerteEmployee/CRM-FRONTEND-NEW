import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Download } from "lucide-react";
import { useState } from "react";

const BulkExport = () => {
  const [format, setFormat] = useState("pdf");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold">Bulk PDF Export</h1><p className="text-muted-foreground">Export documents in bulk</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
          {[
            { label: "Invoices", desc: "Export all invoices", count: 5 },
            { label: "Proposals", desc: "Export all proposals", count: 2 },
            { label: "Estimates", desc: "Export all estimates", count: 3 },
            { label: "Contracts", desc: "Export all contracts", count: 4 },
            { label: "Credit Notes", desc: "Export all credit notes", count: 2 },
            { label: "Reports", desc: "Export all reports", count: 6 },
          ].map((item) => (
            <Card key={item.label} className="hover-lift">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><FileDown className="h-5 w-5 text-primary" /></div>
                  <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc} ({item.count} items)</p></div>
                </div>
                <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />Export</Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="p-4 space-y-4">
          <h3 className="font-semibold">Custom Export</h3>
          <div className="flex items-center gap-4">
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem><SelectItem value="xlsx">Excel</SelectItem></SelectContent>
            </Select>
            <Button>Export All Documents</Button>
          </div>
        </CardContent></Card>
      </div>
    </DashboardLayout>
  );
};

export default BulkExport;
