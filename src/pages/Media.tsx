import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, Search, Image, File, FileText, Film } from "lucide-react";
import { useState } from "react";

const mediaFiles = [
  { id: "m1", name: "logo.png", type: "image", size: "245 KB", uploaded: "2026-02-15", by: "Admin" },
  { id: "m2", name: "proposal-template.pdf", type: "document", size: "1.2 MB", uploaded: "2026-02-20", by: "Sarah Chen" },
  { id: "m3", name: "product-demo.mp4", type: "video", size: "45 MB", uploaded: "2026-03-01", by: "Mike Johnson" },
  { id: "m4", name: "banner.jpg", type: "image", size: "380 KB", uploaded: "2026-03-03", by: "Emily Davis" },
  { id: "m5", name: "contract-template.docx", type: "document", size: "89 KB", uploaded: "2026-03-05", by: "Admin" },
];

const typeIcons: Record<string, React.ElementType> = { image: Image, document: FileText, video: Film };

const Media = () => {
  const [search, setSearch] = useState("");
  const filtered = mediaFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Media</h1><p className="text-muted-foreground">Manage uploaded files and media</p></div>
          <Dialog><DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" />Upload File</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2"><div className="border-2 border-dashed border-border rounded-lg p-8 text-center"><Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p><Input type="file" className="mt-4" /></div><Button className="w-full">Upload</Button></div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search files..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger">
          {filtered.map((f) => {
            const Icon = typeIcons[f.type] || File;
            return (
              <Card key={f.id} className="hover-lift cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.size} • {f.by}</p>
                    <p className="text-xs text-muted-foreground">{f.uploaded}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Media;
