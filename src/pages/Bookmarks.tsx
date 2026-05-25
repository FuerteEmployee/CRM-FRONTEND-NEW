import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarkService } from "@/api/services/bookmark.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Trash2, Bookmark as BookmarkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";

export default function Bookmarks() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await bookmarkService.getBookmarks();
      return res || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookmarkService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Deleted", description: "Bookmark removed." });
    },
  });

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b: any) =>
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.url?.toLowerCase().includes(search.toLowerCase())
    );
  }, [bookmarks, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookmarkIcon className="h-6 w-6 text-primary" />
              Bookmarks
            </h1>
            <p className="text-sm text-muted-foreground">Manage your synced Chrome bookmarks</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search bookmarks..."
                  className="pl-9 h-9 w-full text-sm bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-4 grid gap-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : filteredBookmarks.length === 0 ? (
                <div className="text-center p-12 flex flex-col items-center">
                  <BookmarkIcon className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-slate-500 font-medium">No bookmarks found.</p>
                  <p className="text-xs text-slate-400 mt-2">Sync them from your Chrome extension.</p>
                </div>
              ) : (
                filteredBookmarks.map((bookmark: any) => (
                  <div key={bookmark._id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <img src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`} alt="" className="h-5 w-5 rounded" onError={(e: any) => { e.target.style.display='none'; }} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-primary transition-colors truncate max-w-[600px] flex items-center gap-2">
                          {bookmark.title}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <span className="text-xs text-slate-400 truncate max-w-[500px]">{bookmark.url}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-1">
                          Added {formatDate(bookmark.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(bookmark._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
