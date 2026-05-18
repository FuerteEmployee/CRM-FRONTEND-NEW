import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Download,
  Eye,
  Trash2,
  Edit,
  Info,
  Search,
  FolderPlus,
  RefreshCw,
  Grid,
  List,
  Folder,
  File,
  Image as ImageIcon,
  FileText,
  Film,
  ChevronRight,
  MoreVertical,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaService } from "@/api/services/media.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const Media = () => {
  const [currentPath, setCurrentPath] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();

  // Fetch media items
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["media", currentPath],
    queryFn: () => mediaService.getMedia(currentPath),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaService.uploadFile(file, currentPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", currentPath] });
      toast.success("File uploaded");
    },
    onError: (err: any) => toast.error("Upload failed"),
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => mediaService.createFolder(name, currentPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", currentPath] });
      toast.success("Folder created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create folder"),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => mediaService.deleteItem(name, currentPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", currentPath] });
      toast.success("Item deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete item"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const filteredItems = items.filter((item: any) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (item: any) => {
    if (item.isFolder) return <Folder className="h-4 w-4 text-gray-500 fill-gray-200" />;
    const ext = item.extension;
    if ([".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].includes(ext))
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if ([".mp4", ".mov", ".avi"].includes(ext))
      return <Film className="h-4 w-4 text-purple-500" />;
    if ([".pdf", ".doc", ".docx", ".txt"].includes(ext))
      return <FileText className="h-4 w-4 text-green-600" />;
    return <File className="h-4 w-4 text-gray-400" />;
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  const navigateTo = (folderName: string) => {
    setCurrentPath((prev) => (prev ? `${prev}/${folderName}` : folderName));
  };

  const goBack = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-120px)] border rounded-md overflow-hidden bg-white shadow-sm">
        {/* Desktop-Style Header Toolbar */}
        <div className="bg-[#333] text-gray-300 p-1 flex items-center gap-1 border-b shadow-inner">
          <Button variant="ghost" size="icon" onClick={goBack} disabled={!currentPath} className="h-7 w-7 text-gray-300 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10 opacity-50 cursor-not-allowed">
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <div className="h-4 w-[1px] bg-white/20 mx-1" />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" title="New Folder">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
              <Input id="folder-name" placeholder="Folder name..." className="my-4" />
              <DialogFooter>
                <Button onClick={() => {
                  const name = (document.getElementById("folder-name") as HTMLInputElement).value;
                  if (name) createFolderMutation.mutate(name);
                }}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <label className="cursor-pointer">
            <div className="flex items-center justify-center h-7 w-7 text-gray-300 hover:bg-white/10 rounded-md transition-colors" title="Upload">
              <Upload className="h-4 w-4" />
            </div>
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>

          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" title="Download">
            <Download className="h-4 w-4" />
          </Button>

          <div className="h-4 w-[1px] bg-white/20 mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" title="Edit">
            <Edit className="h-4 w-4" />
          </Button>

          <div className="h-4 w-[1px] bg-white/20 mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:bg-white/10" onClick={() => refetch()} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          <div className="flex items-center gap-1 ml-auto">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <Input 
                placeholder="Search..." 
                className="h-7 w-40 pl-7 pr-7 bg-white text-gray-900 border-none rounded-sm text-xs focus-visible:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lower Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Side Tree Navigation */}
          <aside className="w-60 bg-[#f5f5f5] border-r overflow-y-auto">
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-blue-100 hover:text-blue-700 rounded cursor-pointer" onClick={() => setCurrentPath("")}>
                <ChevronRight className={cn("h-3 w-3 transition-transform", currentPath === "" ? "rotate-90" : "")} />
                <Folder className="h-4 w-4 text-amber-500 fill-amber-200" />
                media
              </div>
              <div className="ml-4 space-y-0.5 border-l border-gray-300">
                {items.filter((i: any) => i.isFolder).map((folder: any) => (
                  <div 
                    key={folder.name}
                    className="flex items-center gap-2 px-3 py-1 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer rounded"
                    onClick={() => navigateTo(folder.name)}
                  >
                    <Folder className="h-4 w-4 text-amber-500/70" />
                    {folder.name}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main List Workspace */}
          <main className="flex-1 flex flex-col bg-[#e9ecef] overflow-hidden">
            {/* Breadcrumb Info Bar */}
            <div className="bg-white border-b px-3 py-1 flex items-center justify-between text-[11px] text-gray-500 shadow-sm">
              <div className="flex items-center gap-1">
                <span>media</span>
                {breadcrumbs.map((crumb) => (
                  <span key={crumb} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <span>{crumb}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-gray-100 rounded border px-1.5 py-0.5">
                   <button onClick={() => setViewMode("grid")} className={cn(viewMode === "grid" ? "text-blue-600" : "text-gray-400")}><Grid className="h-3 w-3" /></button>
                   <button onClick={() => setViewMode("list")} className={cn(viewMode === "list" ? "text-blue-600" : "text-gray-400")}><List className="h-3 w-3" /></button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 relative">
              {isLoading ? (
                <div className="h-full flex items-center justify-center"><RefreshCw className="h-8 w-8 text-gray-300 animate-spin" /></div>
              ) : filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 font-medium">
                  <p className="text-sm">Folder is empty</p>
                  <p className="text-[11px] mt-1">Drop to add items</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">
                  {filteredItems.map((item: any) => (
                    <div
                      key={item.name}
                      className="group flex flex-col items-center p-2 rounded hover:bg-blue-100 hover:ring-1 hover:ring-blue-400 transition-all cursor-pointer"
                      onDoubleClick={() => item.isFolder && navigateTo(item.name)}
                    >
                      <div className="mb-2 p-2 rounded">{getIcon(item)}</div>
                      <span className="text-[11px] text-center truncate w-full px-1">{item.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="w-full text-left text-xs bg-white rounded border shadow-sm overflow-hidden">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-gray-600">Name</th>
                      <th className="px-3 py-2 font-semibold text-gray-600">Size</th>
                      <th className="px-3 py-2 font-semibold text-gray-600">Type</th>
                      <th className="px-3 py-2 font-semibold text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item: any) => (
                      <tr key={item.name} className="border-b hover:bg-blue-50 group cursor-pointer" onDoubleClick={() => item.isFolder && navigateTo(item.name)}>
                        <td className="px-3 py-2 flex items-center gap-2">
                          {getIcon(item)}
                          <span className="truncate max-w-[200px]">{item.name}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{item.isFolder ? "-" : (item.size / 1024).toFixed(1) + " KB"}</td>
                        <td className="px-3 py-2 text-gray-500 uppercase">{item.isFolder ? "Folder" : item.extension.replace(".", "") || "File"}</td>
                        <td className="px-3 py-2 text-right">
                           <button onClick={() => deleteMutation.mutate(item.name)} className="p-1 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>

        {/* Footer Status Bar */}
        <div className="bg-[#f8f9fa] border-t px-3 py-1 flex items-center justify-between text-[10px] text-gray-500 font-medium">
           <div className="flex items-center gap-4">
              <span>media/{currentPath}</span>
              <span className="h-3 w-[1px] bg-gray-300" />
              <span>Items: {filteredItems.length}</span>
           </div>
           <div>
              <span>Sum: {(filteredItems.reduce((acc: number, cur: any) => acc + (cur.size || 0), 0) / 1024).toFixed(1)} KB</span>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Media;
