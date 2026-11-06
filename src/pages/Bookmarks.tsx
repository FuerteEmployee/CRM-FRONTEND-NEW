import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarkService } from "@/api/services/bookmark.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search,
  ExternalLink,
  Trash2,
  Bookmark as BookmarkIcon,
  Folder as FolderIcon,
  Globe,
  Plus,
  Pencil,
  Lock,
  Compass,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePermissionContext } from "@/context/PermissionContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BookmarkItem {
  _id: string;
  title: string;
  url: string;
  folder?: string;
  is_private?: boolean;
  created_by?: {
    _id?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  } | string;
  client?: {
    _id?: string;
    company?: string;
    name?: string;
  };
  createdAt?: string;
}

const CRM_QUICK_SHORTCUTS = [
  { title: "Customers", url: "/admin/customers", folder: "CRM Shortcuts" },
  { title: "Invoices", url: "/admin/invoices", folder: "CRM Shortcuts" },
  { title: "Tasks", url: "/admin/tasks", folder: "CRM Shortcuts" },
  { title: "Leads", url: "/admin/leads", folder: "CRM Shortcuts" },
  { title: "Reports", url: "/admin/reports", folder: "CRM Shortcuts" },
  { title: "Vendors", url: "/admin/vendors", folder: "CRM Shortcuts" },
];

export default function Bookmarks() {
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFolder, setFormFolder] = useState("CRM Shortcuts");
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formError, setFormError] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = usePermissionContext();

  const { data: bookmarks = [], isLoading } = useQuery<BookmarkItem[]>({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await bookmarkService.getBookmarks();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; url: string; folder: string; is_private: boolean }) =>
      bookmarkService.createBookmark(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Bookmark Added", description: "Bookmark created successfully." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Add Bookmark",
        description: err?.response?.data?.message || err?.message || "Validation error.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      bookmarkService.updateBookmark(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Bookmark Updated", description: "Changes saved successfully." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update",
        description: err?.response?.data?.message || err?.message || "Validation error.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookmarkService.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Deleted", description: "Bookmark removed." });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Delete",
        description: err?.response?.data?.message || err?.message || "Permission denied.",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => bookmarkService.deleteAllBookmarks(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Deleted", description: `${res?.deleted ?? 0} bookmarks removed from the CRM.` });
    },
    onError: (err: any) => {
      toast({ title: "Could not delete", description: err?.message || "Something went wrong.", variant: "destructive" });
    },
  });

  // Unique folders list
  const existingFolders = useMemo(() => {
    const set = new Set<string>(["CRM Shortcuts", "Work", "Personal"]);
    bookmarks.forEach((b) => {
      if (b.folder && b.folder.trim()) set.add(b.folder.trim());
    });
    return Array.from(set);
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    const term = search.toLowerCase();
    return bookmarks.filter((b) => {
      const matchesSearch =
        (b.title || "").toLowerCase().includes(term) ||
        (b.url || "").toLowerCase().includes(term) ||
        (b.folder || "Uncategorized").toLowerCase().includes(term);

      const matchesFolder =
        selectedFolder === "ALL" || (b.folder || "Uncategorized") === selectedFolder;

      return matchesSearch && matchesFolder;
    });
  }, [bookmarks, search, selectedFolder]);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, BookmarkItem[]> = {};
    filteredBookmarks.forEach((b) => {
      const folder = b.folder?.trim() || "Uncategorized";
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(b);
    });
    return groups;
  }, [filteredBookmarks]);

  const openAddDialog = () => {
    setEditingBookmark(null);
    setFormTitle("");
    setFormUrl("");
    setFormFolder(selectedFolder !== "ALL" ? selectedFolder : "CRM Shortcuts");
    setFormIsPrivate(false);
    setFormError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (b: BookmarkItem) => {
    setEditingBookmark(b);
    setFormTitle(b.title || "");
    setFormUrl(b.url || "");
    setFormFolder(b.folder || "Uncategorized");
    setFormIsPrivate(Boolean(b.is_private));
    setFormError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBookmark(null);
    setFormTitle("");
    setFormUrl("");
    setFormFolder("CRM Shortcuts");
    setFormIsPrivate(false);
    setFormError("");
  };

  const handleSaveBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const title = formTitle.trim();
    const url = formUrl.trim();
    const folder = formFolder.trim() || "Uncategorized";

    if (!title) {
      setFormError("Bookmark title is required.");
      return;
    }

    if (!url) {
      setFormError("Bookmark URL is required.");
      return;
    }

    // Defensive check: reject javascript:, data:, vbscript: protocols (Stored XSS defense)
    if (/^(javascript|data|vbscript):/i.test(url)) {
      setFormError("Dangerous URL detected. URLs starting with javascript:, data:, or vbscript: are blocked for security.");
      return;
    }

    // Must be either an internal SPA path (starts with /) or a valid web protocol (http:// or https://)
    if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) {
      setFormError("URL must start with 'http://', 'https://', or an internal path starting with '/'.");
      return;
    }

    if (editingBookmark) {
      updateMutation.mutate({
        id: editingBookmark._id,
        payload: {
          title,
          url,
          folder,
          is_private: formIsPrivate,
        },
      });
    } else {
      createMutation.mutate({
        title,
        url,
        folder,
        is_private: formIsPrivate,
      });
    }
  };

  const handleNavigate = (url: string) => {
    if (!url) return;
    const clean = url.trim();

    // Stored XSS defense
    if (/^(javascript|data|vbscript):/i.test(clean)) {
      toast({
        title: "Blocked Suspicious URL",
        description: "This link contains an unsafe protocol and was blocked for your security.",
        variant: "destructive",
      });
      return;
    }

    // Internal CRM link -> navigate via React Router SPA
    if (clean.startsWith("/")) {
      navigate(clean);
      return;
    }

    // External link -> open in new tab securely
    window.open(clean, "_blank", "noopener,noreferrer");
  };

  const canEditOrDelete = (b: BookmarkItem) => {
    if (isAdmin) return true;
    if (!b.created_by) return true;
    const creatorId = typeof b.created_by === "object" ? b.created_by._id : b.created_by;
    return user?._id && creatorId === user._id;
  };

  const renderFavicon = (url: string) => {
    try {
      if (url.startsWith("/")) {
        return <Compass className="h-5 w-5 text-blue-600" />;
      }
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "newtab" ||
        urlObj.protocol === "chrome:" ||
        urlObj.protocol === "edge:" ||
        !hostname.includes(".")
      ) {
        return <Globe className="h-5 w-5 text-slate-400" />;
      }

      return (
        <img
          src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
          alt=""
          className="h-5 w-5 rounded object-contain"
          onError={(e: any) => {
            e.target.style.display = "none";
          }}
        />
      );
    } catch {
      return <Globe className="h-5 w-5 text-slate-400" />;
    }
  };

  const renderBookmark = (bookmark: BookmarkItem) => {
    const isInternal = bookmark.url.startsWith("/");
    const userCanManage = canEditOrDelete(bookmark);
    const creatorName =
      typeof bookmark.created_by === "object" && bookmark.created_by?.firstname
        ? `${bookmark.created_by.firstname} ${bookmark.created_by.lastname || ""}`.trim()
        : null;

    return (
      <div
        key={bookmark._id}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md transition-all hover:border-blue-400/40 group gap-3"
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            onClick={() => handleNavigate(bookmark.url)}
            className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/70 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors cursor-pointer"
            title="Click to open"
          >
            {renderFavicon(bookmark.url)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleNavigate(bookmark.url)}
                className="font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate max-w-[400px] text-sm text-left flex items-center gap-1.5 focus:outline-none"
              >
                {bookmark.title}
                {isInternal ? (
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                ) : (
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                )}
              </button>

              {bookmark.is_private && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0 h-4 gap-1 font-medium inline-flex items-center"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Private
                </Badge>
              )}

              {isInternal && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  CRM Shortcut
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
              <span className="truncate max-w-[320px] font-mono text-[11px] text-slate-500">
                {bookmark.url}
              </span>
              {creatorName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400">by {creatorName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium gap-1"
            onClick={() => handleNavigate(bookmark.url)}
            title="Open link"
          >
            {isInternal ? "Open" : "Visit"}
            {isInternal ? <ArrowRight className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
          </Button>

          {userCanManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => openEditDialog(bookmark)}
                title="Edit bookmark"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => deleteMutation.mutate(bookmark._id)}
                title="Delete bookmark"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <BookmarkIcon className="h-6 w-6 text-blue-600" />
              Bookmarks
            </h1>
            <p className="text-sm text-muted-foreground">
              Save, organize, and access frequently used CRM pages and external websites
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && bookmarks.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={deleteAllMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all {bookmarks.length} bookmarks?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes every bookmark for your entire organization. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => deleteAllMutation.mutate()}
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["bookmarks"] })}
              className="gap-1.5"
            >
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={openAddDialog}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Bookmark
            </Button>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border border-slate-200/80 shadow-xs">
          <CardContent className="p-0">
            {/* Search & Folder Filter Pills */}
            <div className="p-4 border-b bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by title, url, or folder..."
                  className="pl-9 h-9 w-full text-sm bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Folder Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <Button
                  variant={selectedFolder === "ALL" ? "default" : "outline"}
                  size="sm"
                  className={`h-8 text-xs rounded-full px-3 shrink-0 ${
                    selectedFolder === "ALL" ? "bg-blue-600 hover:bg-blue-700" : "bg-white"
                  }`}
                  onClick={() => setSelectedFolder("ALL")}
                >
                  All ({bookmarks.length})
                </Button>
                {existingFolders.map((folder) => {
                  const count = bookmarks.filter((b) => (b.folder || "Uncategorized") === folder).length;
                  if (count === 0 && folder !== "CRM Shortcuts") return null;
                  return (
                    <Button
                      key={folder}
                      variant={selectedFolder === folder ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs rounded-full px-3 shrink-0 ${
                        selectedFolder === folder ? "bg-blue-600 hover:bg-blue-700" : "bg-white"
                      }`}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      {folder} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* List / Groups */}
            <div className="p-4 sm:p-6 grid gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))
              ) : filteredBookmarks.length === 0 ? (
                <div className="text-center py-16 px-4 flex flex-col items-center max-w-md mx-auto">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                    <BookmarkIcon className="h-7 w-7 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {search ? "No matching bookmarks" : "No bookmarks added yet"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {search
                      ? `No bookmarks match "${search}". Try clearing your search term.`
                      : "Easily bookmark your frequently visited CRM pages (e.g. Customers, Invoices) or external websites for fast 1-click access."}
                  </p>

                  <div className="mt-5 flex gap-2">
                    {search ? (
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                        Clear Search
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={openAddDialog}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Bookmark
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                Object.entries(groupedBookmarks).map(([folderName, items]) => (
                  <div key={folderName} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <FolderIcon className="h-4 w-4 text-blue-600" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                        {folderName}
                      </h3>
                      <div className="h-px bg-slate-200/80 flex-1 ml-2"></div>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    <div className="grid gap-2.5">
                      {items.map((bookmark) => renderBookmark(bookmark))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add / Edit Bookmark Modal Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <BookmarkIcon className="h-5 w-5 text-blue-600" />
                {editingBookmark ? "Edit Bookmark" : "Add New Bookmark"}
              </DialogTitle>
              <DialogDescription>
                {editingBookmark
                  ? "Update your bookmark title, destination URL, or folder."
                  : "Quickly save a CRM shortcut or an external website link."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveBookmark} className="space-y-4 pt-2">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick CRM Presets (Only in Add mode) */}
              {!editingBookmark && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 font-medium">Quick CRM Shortcuts</Label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CRM_QUICK_SHORTCUTS.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => {
                          setFormTitle(item.title);
                          setFormUrl(item.url);
                          setFormFolder(item.folder);
                        }}
                        className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-md border border-slate-200/60 transition-colors"
                      >
                        + {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-slate-700">
                  Bookmark Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Invoices & Billing, GST Portal, Documentation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <Label htmlFor="url" className="text-xs font-semibold text-slate-700">
                  Destination URL or Path <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="url"
                  placeholder="e.g. /admin/invoices or https://services.gst.gov.in"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="h-9 text-sm font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Internal CRM paths start with <code className="text-blue-600 font-semibold">/</code> (e.g. /admin/customers). External sites start with <code className="text-blue-600 font-semibold">https://</code>.
                </p>
              </div>

              {/* Folder */}
              <div className="space-y-1.5">
                <Label htmlFor="folder" className="text-xs font-semibold text-slate-700">
                  Folder / Category
                </Label>
                <Input
                  id="folder"
                  placeholder="e.g. CRM Shortcuts, Finance, Work, External"
                  value={formFolder}
                  onChange={(e) => setFormFolder(e.target.value)}
                  className="h-9 text-sm"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {existingFolders.slice(0, 4).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormFolder(f)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        formFolder === f
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Private Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label htmlFor="is_private" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    Personal Bookmark
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    When enabled, only you can see this bookmark.
                  </p>
                </div>
                <Switch
                  id="is_private"
                  checked={formIsPrivate}
                  onCheckedChange={setFormIsPrivate}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingBookmark
                    ? "Save Changes"
                    : "Add Bookmark"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
