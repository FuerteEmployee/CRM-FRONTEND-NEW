import { useState, useRef, useCallback } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, BookOpen, Eye, ThumbsUp, Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer, Undo, Redo, Bold, Italic, Underline, AlignLeft, List, Zap, Trash2, Pencil, AlignCenter, AlignRight, AlignJustify, Strikethrough, Link, Image, Code, Quote, Eraser, Type, Palette, Minus, MoreHorizontal, Save, Copy, Scissors, ClipboardPaste, ZoomIn, ZoomOut, Maximize2, FileText, Table, Film } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/dateFormat";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";


const KnowledgeBase = () => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);
  useOpenCreateModal(() => setIsNewArticleModalOpen(true));
  const queryClient = useQueryClient();

  const [newArticleData, setNewArticleData] = useState({
    subject: "",
    group: "",
    internal: false,
    disabled: false,
    description: ""
  });

  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const [newGroupData, setNewGroupData] = useState({
    name: "",
    color: "#000000",
    description: "",
    order: 1,
    disabled: false
  });

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["kb-groups"],
    queryFn: supportService.getKBGroups,
  });

  const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["kb-articles", selectedGroupId],
    queryFn: () =>
      supportService.getKBArticles(
        selectedGroupId === "all" ? null : selectedGroupId
      ),
  });

  const filtered = articles.filter((a: any) =>
    (a.title || a.subject || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalEntries = filtered.length;
  const pageSize = itemsPerPage === "All" ? totalEntries : parseInt(itemsPerPage);
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedArticles = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const createGroupMutation = useMutation({
    mutationFn: (data: any) => supportService.createKBGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-groups"] });
      setIsAddGroupModalOpen(false);
      setNewGroupData({ name: "", color: "#000000", description: "", order: 1, disabled: false });
      toast.success("Group created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create group")
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingArticleId) return supportService.updateKBArticle(editingArticleId, data);
      return supportService.createKBArticle(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      setIsNewArticleModalOpen(false);
      setNewArticleData({ subject: "", group: "", internal: false, disabled: false, description: "" });
      setEditingArticleId(null);
      toast.success(editingArticleId ? "Article updated successfully" : "Article created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save article")
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => supportService.deleteKBArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast.success("Article deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete article")
  });

  const handleBulkAction = async () => {
    if (selectedArticles.length === 0) {
      toast.error("No articles selected.");
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedArticles.map(id => supportService.deleteKBArticle(id)));
        toast.success(`Deleted ${selectedArticles.length} articles.`);
      }
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      setSelectedArticles([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch (err: any) {
      toast.error("Failed to perform bulk action.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(paginatedArticles.map((a: any) => a._id));
    } else {
      setSelectedArticles([]);
    }
  };

  const openEditModal = (article: any) => {
    setEditingArticleId(article._id);
    setNewArticleData({
      subject: article.subject || article.title || "",
      group: article.group || "",
      internal: article.internal || false,
      disabled: article.disabled || false,
      description: article.description || ""
    });
    setIsNewArticleModalOpen(true);
  };

  const quillRef = useRef<ReactQuill>(null);

  // Execute a Quill formatting command
  const execFormat = useCallback((format: string, value: any = true) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    editor.format(format, value);
  }, []);

  // Menu bar actions
  const handleFileAction = (action: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    if (action === "print") {
      const content = editor.root.innerHTML;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<html><head><title>Article</title><style>body{font-family:sans-serif;padding:24px;max-width:800px;margin:0 auto}</style></head><body>${content}</body></html>`);
        w.document.close();
        w.print();
      }
    } else if (action === "save") {
      toast.success("Article content saved to draft");
    } else if (action === "export-html") {
      const blob = new Blob([editor.root.innerHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "article.html"; a.click();
      URL.revokeObjectURL(url);
    } else if (action === "export-txt") {
      const blob = new Blob([editor.getText()], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "article.txt"; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleEditAction = (action: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    if (action === "undo") editor.history.undo();
    else if (action === "redo") editor.history.redo();
    else if (action === "select-all") editor.setSelection(0, editor.getLength());
    else if (action === "copy") document.execCommand("copy");
    else if (action === "cut") document.execCommand("cut");
    else if (action === "paste") document.execCommand("paste");
    else if (action === "clear") { editor.setText(""); setNewArticleData(p => ({ ...p, description: "" })); }
  };

  const handleInsertAction = (action: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    if (action === "link") {
      const url = prompt("Enter URL:", "https://");
      if (url) editor.format("link", url);
    } else if (action === "image") {
      const url = prompt("Enter image URL:");
      if (url) editor.insertEmbed(range.index, "image", url);
    } else if (action === "hr") {
      editor.insertText(range.index, "\n─────────────────────────────\n");
    } else if (action === "table") {
      const rows = prompt("Number of rows:", "3");
      const cols = prompt("Number of columns:", "3");
      if (rows && cols) {
        const r = parseInt(rows), c = parseInt(cols);
        let tableHtml = '<table border="1" style="border-collapse:collapse;width:100%">';
        for (let i = 0; i < r; i++) {
          tableHtml += "<tr>";
          for (let j = 0; j < c; j++) tableHtml += `<td style="padding:8px;border:1px solid #ccc"> </td>`;
          tableHtml += "</tr>";
        }
        tableHtml += "</table>";
        editor.clipboard.dangerouslyPasteHTML(range.index, tableHtml);
      }
    } else if (action === "code") {
      editor.format("code-block", true);
    } else if (action === "blockquote") {
      editor.format("blockquote", true);
    }
  };

  const handleViewAction = (action: string) => {
    const editorEl = document.querySelector(".ql-editor") as HTMLElement;
    if (!editorEl) return;
    if (action === "zoom-in") editorEl.style.fontSize = (parseFloat(editorEl.style.fontSize || "14") + 2) + "px";
    else if (action === "zoom-out") editorEl.style.fontSize = Math.max(10, parseFloat(editorEl.style.fontSize || "14") - 2) + "px";
    else if (action === "reset-zoom") editorEl.style.fontSize = "14px";
    else if (action === "fullscreen") {
      const wrapper = document.querySelector(".rich-editor-wrapper") as HTMLElement;
      if (wrapper) wrapper.classList.toggle("fullscreen-editor");
    }
  };

  const QUILL_MODULES = {
    toolbar: false, // we render our own
    history: { delay: 500, maxStack: 200, userOnly: true },
  };

  const QUILL_FORMATS = [
    "header", "font", "size", "bold", "italic", "underline", "strike",
    "blockquote", "code-block", "list", "bullet", "indent",
    "link", "image", "video", "color", "background", "align",
  ];

  // Our custom styled toolbar for the article editor
  const ArticleEditorToolbar = ({ onFileAction, onEditAction, onInsertAction, onViewAction, onFormat }: any) => {
    const toolBtn = (icon: React.ReactNode, title: string, onClick: () => void, active = false) => (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors",
          active && "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </button>
    );

    return (
      <div className="bg-slate-50 border-b border-slate-200">
        {/* Menu bar */}
        <div className="flex items-center gap-0 px-2 h-8 text-[11px] font-medium text-slate-600 border-b border-slate-100">
          {/* FILE */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">File</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onFileAction("save")} className="gap-2.5"><Save className="h-3.5 w-3.5" />Save Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileAction("print")} className="gap-2.5"><Printer className="h-3.5 w-3.5" />Print</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFileAction("export-html")} className="gap-2.5"><FileText className="h-3.5 w-3.5" />Export as HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFileAction("export-txt")} className="gap-2.5"><FileType className="h-3.5 w-3.5" />Export as Text</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* EDIT */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">Edit</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onEditAction("undo")} className="gap-2.5"><Undo className="h-3.5 w-3.5" />Undo <span className="ml-auto text-slate-400">Ctrl+Z</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditAction("redo")} className="gap-2.5"><Redo className="h-3.5 w-3.5" />Redo <span className="ml-auto text-slate-400">Ctrl+Y</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditAction("cut")} className="gap-2.5"><Scissors className="h-3.5 w-3.5" />Cut <span className="ml-auto text-slate-400">Ctrl+X</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditAction("copy")} className="gap-2.5"><Copy className="h-3.5 w-3.5" />Copy <span className="ml-auto text-slate-400">Ctrl+C</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditAction("paste")} className="gap-2.5"><ClipboardPaste className="h-3.5 w-3.5" />Paste <span className="ml-auto text-slate-400">Ctrl+V</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditAction("select-all")} className="gap-2.5"><MoreHorizontal className="h-3.5 w-3.5" />Select All <span className="ml-auto text-slate-400">Ctrl+A</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditAction("clear")} className="gap-2.5 text-rose-600"><Eraser className="h-3.5 w-3.5" />Clear All</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* VIEW */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">View</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onViewAction("zoom-in")} className="gap-2.5"><ZoomIn className="h-3.5 w-3.5" />Zoom In</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAction("zoom-out")} className="gap-2.5"><ZoomOut className="h-3.5 w-3.5" />Zoom Out</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAction("reset-zoom")} className="gap-2.5"><Eye className="h-3.5 w-3.5" />Reset Zoom (100%)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewAction("fullscreen")} className="gap-2.5"><Maximize2 className="h-3.5 w-3.5" />Toggle Fullscreen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* INSERT */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">Insert</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onInsertAction("link")} className="gap-2.5"><Link className="h-3.5 w-3.5" />Link</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertAction("image")} className="gap-2.5"><Image className="h-3.5 w-3.5" />Image (URL)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertAction("table")} className="gap-2.5"><Table className="h-3.5 w-3.5" />Table</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInsertAction("hr")} className="gap-2.5"><Minus className="h-3.5 w-3.5" />Horizontal Rule</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertAction("blockquote")} className="gap-2.5"><Quote className="h-3.5 w-3.5" />Block Quote</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsertAction("code")} className="gap-2.5"><Code className="h-3.5 w-3.5" />Code Block</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* FORMAT */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">Format</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 text-xs">
              <DropdownMenuItem onClick={() => onFormat("bold", true)} className="gap-2.5 font-bold"><Bold className="h-3.5 w-3.5" />Bold <span className="ml-auto text-slate-400 font-normal">Ctrl+B</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFormat("italic", true)} className="gap-2.5 italic"><Italic className="h-3.5 w-3.5" />Italic <span className="ml-auto text-slate-400 font-normal">Ctrl+I</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFormat("underline", true)} className="gap-2.5 underline"><Underline className="h-3.5 w-3.5" />Underline <span className="ml-auto text-slate-400 font-normal">Ctrl+U</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFormat("strike", true)} className="gap-2.5 line-through"><Strikethrough className="h-3.5 w-3.5" />Strikethrough</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5"><Type className="h-3.5 w-3.5" />Heading</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {[1,2,3,4,5,6].map(h => (
                    <DropdownMenuItem key={h} onClick={() => onFormat("header", h)} className="gap-2 text-xs">Heading {h}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onFormat("header", false)} className="gap-2 text-xs">Normal text</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2.5"><AlignLeft className="h-3.5 w-3.5" />Alignment</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onFormat("align", false)} className="gap-2 text-xs"><AlignLeft className="h-3.5 w-3.5" />Left</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFormat("align", "center")} className="gap-2 text-xs"><AlignCenter className="h-3.5 w-3.5" />Center</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFormat("align", "right")} className="gap-2 text-xs"><AlignRight className="h-3.5 w-3.5" />Right</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFormat("align", "justify")} className="gap-2 text-xs"><AlignJustify className="h-3.5 w-3.5" />Justify</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFormat("bold", false) && onFormat("italic", false) && onFormat("underline", false)} className="gap-2.5 text-slate-500"><Eraser className="h-3.5 w-3.5" />Clear Formatting</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* TOOLS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer hover:bg-slate-100 px-2.5 h-full rounded transition-colors font-semibold">Tools</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => {
                const editor = quillRef.current?.getEditor();
                if (editor) {
                  const text = editor.getText();
                  const words = text.trim().split(/\s+/).filter(Boolean).length;
                  const chars = text.length;
                  toast.info(`Words: ${words} · Characters: ${chars - 1}`);
                }
              }} className="gap-2.5"><FileText className="h-3.5 w-3.5" />Word Count</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection();
                if (!range || range.length === 0) { toast.warning("Select text first"); return; }
                const text = editor.getText(range.index, range.length);
                editor.deleteText(range.index, range.length);
                editor.insertText(range.index, text.toUpperCase());
              }} className="gap-2.5"><Type className="h-3.5 w-3.5" />UPPERCASE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection();
                if (!range || range.length === 0) { toast.warning("Select text first"); return; }
                const text = editor.getText(range.index, range.length);
                editor.deleteText(range.index, range.length);
                editor.insertText(range.index, text.toLowerCase());
              }} className="gap-2.5"><Type className="h-3.5 w-3.5" />lowercase</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const html = editor.root.innerHTML;
                navigator.clipboard.writeText(html).then(() => toast.success("HTML copied to clipboard"));
              }} className="gap-2.5"><Copy className="h-3.5 w-3.5" />Copy as HTML</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-0.5 p-1.5">
          {/* Undo/Redo/Print */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            {toolBtn(<Undo className="h-3.5 w-3.5" />, "Undo (Ctrl+Z)", () => onEditAction("undo"))}
            {toolBtn(<Redo className="h-3.5 w-3.5" />, "Redo (Ctrl+Y)", () => onEditAction("redo"))}
            {toolBtn(<Printer className="h-3.5 w-3.5" />, "Print", () => onFileAction("print"))}
          </div>
          {/* Heading */}
          <div className="flex items-center pr-2 border-r border-slate-200 mr-1">
            <select
              onChange={(e) => onFormat("header", e.target.value === "0" ? false : parseInt(e.target.value))}
              defaultValue="0"
              className="h-7 text-[11px] font-semibold bg-transparent border border-slate-200 rounded px-1 cursor-pointer outline-none hover:border-primary"
            >
              <option value="0">Normal text</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
              <option value="4">Heading 4</option>
              <option value="5">Heading 5</option>
              <option value="6">Heading 6</option>
            </select>
          </div>
          {/* Font size */}
          <div className="flex items-center pr-2 border-r border-slate-200 mr-1">
            <select
              onChange={(e) => onFormat("size", e.target.value || false)}
              defaultValue=""
              className="h-7 text-[11px] font-semibold bg-transparent border border-slate-200 rounded px-1 cursor-pointer outline-none hover:border-primary"
            >
              <option value="">Normal</option>
              <option value="small">Small</option>
              <option value="large">Large</option>
              <option value="huge">Huge</option>
            </select>
          </div>
          {/* Bold / Italic / Underline / Strike */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            {toolBtn(<Bold className="h-3.5 w-3.5" />, "Bold (Ctrl+B)", () => onFormat("bold", true))}
            {toolBtn(<Italic className="h-3.5 w-3.5" />, "Italic (Ctrl+I)", () => onFormat("italic", true))}
            {toolBtn(<Underline className="h-3.5 w-3.5" />, "Underline (Ctrl+U)", () => onFormat("underline", true))}
            {toolBtn(<Strikethrough className="h-3.5 w-3.5" />, "Strikethrough", () => onFormat("strike", true))}
          </div>
          {/* Color */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            <label title="Text Color" className="flex items-center h-7 w-7 justify-center rounded hover:bg-primary/10 cursor-pointer">
              <Palette className="h-3.5 w-3.5 text-slate-600" />
              <input type="color" className="sr-only" onChange={(e) => onFormat("color", e.target.value)} />
            </label>
            <label title="Highlight Color" className="flex items-center h-7 w-7 justify-center rounded hover:bg-primary/10 cursor-pointer">
              <span className="h-3.5 w-3.5 rounded text-[9px] font-black flex items-center justify-center bg-yellow-300">A</span>
              <input type="color" className="sr-only" defaultValue="#fef08a" onChange={(e) => onFormat("background", e.target.value)} />
            </label>
          </div>
          {/* Alignment */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            {toolBtn(<AlignLeft className="h-3.5 w-3.5" />, "Align Left", () => onFormat("align", false))}
            {toolBtn(<AlignCenter className="h-3.5 w-3.5" />, "Align Center", () => onFormat("align", "center"))}
            {toolBtn(<AlignRight className="h-3.5 w-3.5" />, "Align Right", () => onFormat("align", "right"))}
            {toolBtn(<AlignJustify className="h-3.5 w-3.5" />, "Justify", () => onFormat("align", "justify"))}
          </div>
          {/* Lists */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            {toolBtn(<List className="h-3.5 w-3.5" />, "Bullet List", () => onFormat("list", "bullet"))}
            {toolBtn(<span className="text-[11px] font-black text-slate-700">1.</span>, "Ordered List", () => onFormat("list", "ordered"))}
          </div>
          {/* Insert */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 mr-1">
            {toolBtn(<Link className="h-3.5 w-3.5" />, "Insert Link", () => onInsertAction("link"))}
            {toolBtn(<Image className="h-3.5 w-3.5" />, "Insert Image", () => onInsertAction("image"))}
            {toolBtn(<Quote className="h-3.5 w-3.5" />, "Blockquote", () => onInsertAction("blockquote"))}
            {toolBtn(<Code className="h-3.5 w-3.5" />, "Code Block", () => onInsertAction("code"))}
          </div>
          {/* Clear */}
          <div className="flex items-center gap-0.5">
            {toolBtn(<Eraser className="h-3.5 w-3.5" />, "Clear Formatting", () => {
              const editor = quillRef.current?.getEditor();
              if (!editor) return;
              const range = editor.getSelection();
              if (range) editor.removeFormat(range.index, range.length);
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between pt-4">
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <Dialog open={isNewArticleModalOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingArticleId(null);
              setNewArticleData({ subject: "", group: "", internal: false, disabled: false, description: "" });
            }
            setIsNewArticleModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                <Plus className="h-4 w-4" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
              <div className="bg-white px-8 py-6 text-slate-900 flex items-center justify-between border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Article Management</p>
                  <DialogTitle className="text-2xl font-black tracking-tight">{editingArticleId ? "Edit Article" : "Create New Article"}</DialogTitle>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar bg-white">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subject *</Label>
                  <Input
                    placeholder="Enter article subject..."
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:bg-white transition-all"
                    value={newArticleData.subject}
                    onChange={(e) => setNewArticleData({ ...newArticleData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Group *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={groups.map((g: any) => ({ label: g.name, value: g._id }))}
                        value={newArticleData.group}
                        onValueChange={(val) => setNewArticleData({ ...newArticleData, group: val })}
                        placeholder="Select or search group..."
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddGroupModalOpen(true)}
                      className="h-11 w-11 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-primary/5 hover:text-primary transition-all border-dashed"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="internal"
                      className="rounded-md border-slate-300"
                      checked={newArticleData.internal}
                      onCheckedChange={(val) => setNewArticleData({ ...newArticleData, internal: !!val })}
                    />
                    <Label htmlFor="internal" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Internal Article</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="disabled"
                      className="rounded-md border-slate-300"
                      checked={newArticleData.disabled}
                      onCheckedChange={(val) => setNewArticleData({ ...newArticleData, disabled: !!val })}
                    />
                    <Label htmlFor="disabled" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Disabled</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Article Description</Label>
                  <div className="rich-editor-wrapper rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <ArticleEditorToolbar
                      onFileAction={handleFileAction}
                      onEditAction={handleEditAction}
                      onInsertAction={handleInsertAction}
                      onViewAction={handleViewAction}
                      onFormat={execFormat}
                    />
                    <style>{`
                      .rich-editor-wrapper .ql-editor {
                        min-height: 260px;
                        font-size: 14px;
                        line-height: 1.75;
                        padding: 16px 20px;
                        font-family: inherit;
                        color: #1e293b;
                      }
                      .rich-editor-wrapper .ql-editor.ql-blank::before {
                        color: #94a3b8;
                        font-style: normal;
                        font-size: 14px;
                        left: 20px;
                      }
                      .rich-editor-wrapper .ql-container {
                        border: none;
                        font-family: inherit;
                      }
                      .rich-editor-wrapper.fullscreen-editor {
                        position: fixed;
                        inset: 0;
                        z-index: 9999;
                        border-radius: 0;
                        display: flex;
                        flex-direction: column;
                      }
                      .rich-editor-wrapper.fullscreen-editor .ql-editor {
                        flex: 1;
                        max-height: none;
                      }
                    `}</style>
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={newArticleData.description}
                      onChange={(val) => setNewArticleData(p => ({ ...p, description: val }))}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      placeholder="Write article content here — use the menus and toolbar above to format your text..."
                    />
                  </div>
                </div>

              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewArticleModalOpen(false)}
                  className="px-6 h-10 border-slate-200 hover:bg-white hover:border-slate-300 text-foreground font-semibold rounded-xl transition-all shadow-sm"
                >
                  Close
                </Button>
                <Button
                  onClick={() => createArticleMutation.mutate(newArticleData)}
                  disabled={!newArticleData.subject || !newArticleData.group || createArticleMutation.isPending}
                  className="rounded-xl font-bold text-sm h-10 px-8 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  {createArticleMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Group Modal */}
          <Dialog open={isAddGroupModalOpen} onOpenChange={setIsAddGroupModalOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl flex flex-col">
              <div className="bg-white px-8 py-6 text-slate-900 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Configuration</p>
                  <DialogTitle className="text-2xl font-black tracking-tight">Add New Group</DialogTitle>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="p-8 space-y-5 bg-white overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Group Name *</Label>
                    <Input
                      placeholder="e.g. Technical Support"
                      className="h-11 rounded-xl border-slate-200 font-bold"
                      value={newGroupData.name}
                      onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="h-11 w-12 p-1 rounded-xl border-slate-200 cursor-pointer"
                        value={newGroupData.color}
                        onChange={(e) => setNewGroupData({ ...newGroupData, color: e.target.value })}
                      />
                      <Input
                        placeholder="#000000"
                        className="h-11 flex-1 rounded-xl border-slate-200 font-mono text-sm"
                        value={newGroupData.color}
                        onChange={(e) => setNewGroupData({ ...newGroupData, color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Short Description</Label>
                  <div className="rich-editor-wrapper rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <ArticleEditorToolbar
                      onFileAction={handleFileAction}
                      onEditAction={handleEditAction}
                      onInsertAction={handleInsertAction}
                      onViewAction={handleViewAction}
                      onFormat={execFormat}
                    />
                    <style>{`
                      .rich-editor-wrapper .ql-editor { min-height: 120px; font-size: 13px; line-height: 1.6; padding: 12px 16px; font-family: inherit; color: #1e293b; }
                      .rich-editor-wrapper .ql-editor.ql-blank::before { color: #94a3b8; font-style: normal; font-size: 13px; left: 16px; }
                      .rich-editor-wrapper .ql-container { border: none; font-family: inherit; }
                    `}</style>
                    <ReactQuill
                      theme="snow"
                      value={newGroupData.description}
                      onChange={(val) => setNewGroupData(p => ({ ...p, description: val }))}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      placeholder="Brief description of this group..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Order</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-xl border-slate-200 font-bold"
                      value={newGroupData.order}
                      onChange={(e) => setNewGroupData({ ...newGroupData, order: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-2 pb-1">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Checkbox
                        id="group-disabled"
                        className="rounded-md border-slate-300"
                        checked={newGroupData.disabled}
                        onCheckedChange={(val) => setNewGroupData({ ...newGroupData, disabled: !!val })}
                      />
                      <Label htmlFor="group-disabled" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Disabled</Label>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">* All articles in this group will be hidden if disabled is checked</p>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setIsAddGroupModalOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">Close</Button>
                <Button
                  onClick={() => createGroupMutation.mutate(newGroupData)}
                  disabled={!newGroupData.name || createGroupMutation.isPending}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-8 shadow-lg shadow-primary/20"
                >
                  {createGroupMutation.isPending ? "Saving..." : "Save Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Control Bar */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Select value={itemsPerPage} onValueChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[70px] h-8 text-[11px] font-bold">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedArticles.length === 0) {
                    toast.error("Please select at least one article first.");
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-4 gap-2 text-xs font-bold uppercase tracking-wider hover:bg-transparent">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="massDelete"
                          className="border-red-500 data-[state=checked]:bg-red-500"
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({ ...bulkState, massDelete: checked as boolean })}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <Button
                        onClick={handleBulkAction}
                        disabled={!bulkState.massDelete || isBulkLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold tracking-widest uppercase text-xs h-12"
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold uppercase tracking-wider hover:bg-transparent">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative group">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-[200px] text-xs"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider bg-zinc-50/50">
                    <th className="p-3 font-semibold w-8">
                      <Checkbox
                        checked={selectedArticles.length > 0 && selectedArticles.length === paginatedArticles.length}
                        onCheckedChange={handleSelectAll}
                        className="rounded border-zinc-300"
                      />
                    </th>
                    <th className="p-3 font-semibold w-10">#</th>
                    <th className="p-3 font-semibold">Article Name ↕</th>
                    <th className="p-3 font-semibold">Group</th>
                    <th className="p-3 font-semibold">Date Published</th>
                    <th className="p-3 font-semibold text-right">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoadingArticles || isLoadingGroups ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={5} className="p-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground text-sm">
                        No articles found.
                      </td>
                    </tr>
                  ) : (
                    paginatedArticles.map((article: any, index) => (
                      <tr key={article._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedArticles.includes(article._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedArticles([...selectedArticles, article._id]);
                              else setSelectedArticles(selectedArticles.filter(id => id !== article._id));
                            }}
                            className="rounded border-zinc-300"
                          />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground" onClick={() => openEditModal(article)}>
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-3" onClick={() => openEditModal(article)}>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-primary hover:underline">
                              {article.title || article.subject}
                            </span>
                          </div>
                        </td>
                        <td className="p-3" onClick={() => openEditModal(article)}>
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-bold uppercase tracking-wider">
                            {article.group_name || groups.find((g: any) => g._id === article.group)?.name || "General"}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-zinc-600" onClick={() => openEditModal(article)}>
                          {formatDate(article.datecreated || article.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                              onClick={() => openEditModal(article)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                              onClick={() => openEditModal(article)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this article?")) {
                                  deleteArticleMutation.mutate(article._id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing {startEntry} to {endEntry} of {totalEntries} entries
              </span>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 font-bold text-xs hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white font-black text-xs shadow-sm shadow-primary/20">
                  {currentPage}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 font-bold text-xs hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
