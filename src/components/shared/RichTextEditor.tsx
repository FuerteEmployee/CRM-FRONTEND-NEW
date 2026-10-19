import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CheckSquare,
  ChevronDown,
  Code,
  Eye,
  FileCode2,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  MoreHorizontal,
  Palette,
  Printer,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Table as TableIcon,
  Type,
  Underline,
  Undo2,
  Unlink,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { escapeHtml, sanitizeRichHtml, toRichHtml } from "@/lib/richText";
import { RichTextContent } from "./RichTextContent";

// Shared rich text editor used for every description/body field in the CRM.
// Output is HTML (sanitized on paste/source edit and again on display through
// <RichTextContent />). Images are embedded as resized data URLs so the editor
// works the same for every tenant without a separate upload store.

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the writing area (px or any CSS length). */
  minHeight?: number | string;
  className?: string;
  /** Hide the speech-to-text VOICE button. */
  disableVoice?: boolean;
  /** Hide the File / Edit / View ... menu row. */
  hideMenubar?: boolean;
}

const FONTS: [string, string][] = [
  ["System Font", ""],
  ["Andale Mono", "Andale Mono, monospace"],
  ["Arial", "Arial, sans-serif"],
  ["Arial Black", "Arial Black, sans-serif"],
  ["Book Antiqua", "Book Antiqua, serif"],
  ["Comic Sans MS", "Comic Sans MS, cursive"],
  ["Courier New", "Courier New, monospace"],
  ["Georgia", "Georgia, serif"],
  ["Helvetica", "Helvetica, sans-serif"],
  ["Impact", "Impact, sans-serif"],
  ["Tahoma", "Tahoma, sans-serif"],
  ["Times New Roman", "Times New Roman, serif"],
  ["Trebuchet MS", "Trebuchet MS, sans-serif"],
  ["Verdana", "Verdana, sans-serif"],
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48];

const PALETTE = [
  "#BFEDD2", "#FBEEB8", "#F8CAC6", "#ECCAFA", "#C2E0F4",
  "#2DC26B", "#F1C40F", "#E03E2D", "#B96AD9", "#3598DB",
  "#169179", "#E67E23", "#BA372A", "#843FA1", "#236FA1",
  "#ECF0F1", "#CED4D9", "#95A5A6", "#7E8C8D", "#34495E",
];

// [label, list-style-type, sample marker]
const BULLET_STYLES: [string, string, string][] = [["Default", "", "●"], ["Circle", "circle", "○"], ["Square", "square", "■"]];
const NUMBER_STYLES: [string, string, string][] = [
  ["Default", "", "1."],
  ["Lower Alpha", "lower-alpha", "a."],
  ["Upper Alpha", "upper-alpha", "A."],
  ["Lower Roman", "lower-roman", "i."],
  ["Upper Roman", "upper-roman", "I."],
  ["Lower Greek", "lower-greek", "α."],
];

const BLOCKS: [string, string][] = [
  ["Paragraph", "p"],
  ["Heading 1", "h1"],
  ["Heading 2", "h2"],
  ["Heading 3", "h3"],
  ["Heading 4", "h4"],
  ["Blockquote", "blockquote"],
  ["Code block", "pre"],
];

const STATE_COMMANDS = [
  "bold", "italic", "underline", "strikeThrough", "superscript", "subscript",
  "justifyLeft", "justifyCenter", "justifyRight", "justifyFull",
  "insertUnorderedList", "insertOrderedList",
] as const;
type ActiveState = Partial<Record<(typeof STATE_COMMANDS)[number] | "checklist", boolean>>;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Reads an image file and shrinks large photos so descriptions stay small. */
const imageFileToDataUrl = async (file: File): Promise<string> => {
  if (!/^image\/(png|jpe?g|gif|webp|bmp)$/i.test(file.type)) throw new Error("Only PNG, JPG, GIF, WEBP or BMP images are supported.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is larger than 10 MB.");
  const original = await readAsDataUrl(file);
  if (file.type === "image/gif" || file.size < 200 * 1024) return original;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read the image."));
    el.src = original;
  });
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  const resized = file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
  return resized.length < original.length ? resized : original;
};

const normalizeUrl = (raw: string): string | null => {
  const url = raw.trim();
  if (!url) return null;
  if (/^\s*(javascript|vbscript|data):/i.test(url)) return null;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
};

const ToolButton = ({
  title,
  active,
  onClick,
  children,
  className,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn("h-8 w-8 rounded-lg hover:bg-slate-200", active && "bg-primary/10 text-primary hover:bg-primary/15", className)}
  >
    {children}
  </Button>
);

const Divider = () => <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;

const TableGridPicker = ({ onPick }: { onPick: (rows: number, cols: number) => void }) => {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  return (
    <div className="p-2 flex flex-col items-center">
      <div className="grid grid-cols-10 gap-px" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
        {Array.from({ length: 100 }).map((_, i) => {
          const r = Math.floor(i / 10);
          const c = i % 10;
          const on = r < hover.rows && c < hover.cols;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${c + 1} x ${r + 1}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHover({ rows: r + 1, cols: c + 1 })}
              onClick={() => onPick(r + 1, c + 1)}
              className={cn("h-4 w-4 border rounded-[2px]", on ? "bg-primary/20 border-primary/60" : "bg-white border-slate-200")}
            />
          );
        })}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-slate-500">{hover.cols} x {hover.rows}</div>
    </div>
  );
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 200,
  className,
  disableVoice,
  hideMenubar,
}: RichTextEditorProps) => {
  const { toast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastHtml = useRef("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isEmpty, setIsEmpty] = useState(true);
  const [active, setActive] = useState<ActiveState>({});
  const [fontLabel, setFontLabel] = useState("System Font");
  const [sizeLabel, setSizeLabel] = useState("11");
  const [textColor, setTextColor] = useState("#E03E2D");
  const [markColor, setMarkColor] = useState("#FBEEB8");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBlocks, setShowBlocks] = useState(false);
  const [spellcheck, setSpellcheck] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ url: "", text: "", newTab: true });
  const linkTarget = useRef<HTMLAnchorElement | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageForm, setImageForm] = useState({ src: "", alt: "", width: "" });
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);

  // Popups render inside the editor while it is fullscreen, otherwise they would be hidden behind it.
  const portal = isFullscreen ? wrapperRef.current : undefined;
  const keepFocus = (e: Event) => e.preventDefault();

  /* ----------------------------- selection ----------------------------- */

  const insideEditor = (node: Node | null) => !!node && !!editorRef.current?.contains(node);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && insideEditor(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    const range = savedRange.current;
    if (range && insideEditor(range.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (!sel.rangeCount || !insideEditor(sel.anchorNode)) {
      const end = document.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      sel.removeAllRanges();
      sel.addRange(end);
    }
  }, []);

  const selectionElement = (): HTMLElement | null => {
    const node = savedRange.current?.startContainer ?? null;
    const el = node ? (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement) : null;
    return el && insideEditor(el) ? el : null;
  };

  const closestInEditor = <T extends HTMLElement>(selector: string): T | null => {
    const found = selectionElement()?.closest(selector) as T | null;
    return found && insideEditor(found) ? found : null;
  };

  /* ------------------------------ state ------------------------------- */

  const refreshActive = useCallback(() => {
    const next: ActiveState = {};
    STATE_COMMANDS.forEach((c) => {
      try {
        next[c] = document.queryCommandState(c);
      } catch {
        next[c] = false;
      }
    });
    const el = selectionElement();
    next.checklist = !!el?.closest('ul[data-type="checklist"]');
    if (next.checklist) next.insertUnorderedList = false;
    setActive((prev) => (STATE_COMMANDS.every((c) => prev[c] === next[c]) && prev.checklist === next.checklist ? prev : next));

    if (el) {
      const cs = window.getComputedStyle(el);
      const first = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
      const editorFirst = editorRef.current ? window.getComputedStyle(editorRef.current).fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase() : "";
      const match = FONTS.find(([name]) => name.toLowerCase() === first);
      setFontLabel(first === editorFirst || !match ? "System Font" : match[0]);
      setSizeLabel(String(Math.round(parseFloat(cs.fontSize) * 0.75)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    // Firefox ignores styleWithCSS for some commands; normalise legacy <font> tags to spans.
    el.querySelectorAll("font").forEach((font) => {
      const span = document.createElement("span");
      if (font.face) span.style.fontFamily = font.face;
      if (font.color) span.style.color = font.color;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
    el.querySelectorAll('ul[data-type="checklist"] > li:not([data-checked])').forEach((li) => li.setAttribute("data-checked", "false"));

    const empty = !el.textContent?.replace(/​/g, "").trim() && !el.querySelector("img,table,hr,li");
    setIsEmpty(empty);
    const html = empty ? "" : el.innerHTML;
    if (html === lastHtml.current) return;
    lastHtml.current = html;
    onChangeRef.current?.(html);
  }, []);

  const afterSelect = useCallback(() => {
    saveSelection();
    refreshActive();
  }, [saveSelection, refreshActive]);

  const afterChange = useCallback(() => {
    saveSelection();
    emit();
    refreshActive();
  }, [saveSelection, emit, refreshActive]);

  // External value -> editor (initial load, edit-mode prefill, form reset).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = value ?? "";
    if (incoming === lastHtml.current) return;
    el.innerHTML = toRichHtml(incoming);
    lastHtml.current = incoming;
    setIsEmpty(!el.textContent?.trim() && !el.querySelector("img,table,hr,li"));
  }, [value]);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && insideEditor(sel.anchorNode)) {
        saveSelection();
        refreshActive();
      }
    };
    const onFullscreenChange = () => setIsFullscreen(!!wrapperRef.current && document.fullscreenElement === wrapperRef.current);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      recognitionRef.current?.stop?.();
    };
  }, [saveSelection, refreshActive]);

  /* ----------------------------- commands ----------------------------- */

  const exec = (command: string, arg?: string) => {
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* not supported */
    }
    if (command === "insertUnorderedList" || command === "insertOrderedList") runListCommand(command);
    else document.execCommand(command, false, arg);
    afterChange();
  };

  const insertHtml = (html: string) => exec("insertHTML", html);

  /** Chrome drops the caret to the start of the line after list commands; put it back by text offset. */
  const runListCommand = (command: "insertUnorderedList" | "insertOrderedList") => {
    const el = editorRef.current;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    let offsets: [number, number] | null = null;
    if (el && range && range.startContainer.nodeType === Node.TEXT_NODE && insideEditor(range.startContainer)) {
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      offsets = [start, start + range.toString().length];
    }
    document.execCommand(command);
    if (!el || !offsets || !sel) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startPoint: [Node, number] | null = null;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const len = node.textContent?.length || 0;
      if (!startPoint && offsets[0] <= pos + len) startPoint = [node, offsets[0] - pos];
      if (startPoint && offsets[1] <= pos + len) {
        const next = document.createRange();
        next.setStart(startPoint[0], startPoint[1]);
        next.setEnd(node, offsets[1] - pos);
        sel.removeAllRanges();
        sel.addRange(next);
        return;
      }
      pos += len;
    }
  };

  /** Removes one inline CSS property from every span touched by the selection (used by "remove color", "System Font"). */
  const clearInlineStyle = (props: string[]) => {
    restoreSelection();
    const el = editorRef.current;
    const range = savedRange.current;
    if (!el || !range) return;
    const touched = new Set<HTMLElement>();
    el.querySelectorAll<HTMLElement>("[style]").forEach((n) => {
      if (range.intersectsNode(n)) touched.add(n);
    });
    let up = selectionElement();
    while (up && up !== el) {
      touched.add(up);
      up = up.parentElement;
    }
    touched.forEach((n) => {
      props.forEach((p) => n.style.removeProperty(p));
      if (n.tagName === "SPAN" && !n.getAttribute("style")?.trim()) {
        n.removeAttribute("style");
        if (!n.attributes.length) n.replaceWith(...Array.from(n.childNodes));
      }
    });
    afterChange();
  };

  const applyFont = (family: string) => {
    if (!family) clearInlineStyle(["font-family"]);
    else exec("fontName", family);
  };

  const applyFontSize = (pt: number) => {
    exec("fontSize", "7");
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("span[style]").forEach((s) => {
      if (/xxx-large/.test(s.style.fontSize)) s.style.fontSize = `${pt}pt`;
    });
    el.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${pt}pt`;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    afterChange();
  };

  const applyColor = (kind: "text" | "mark", color: string | null) => {
    if (kind === "text") {
      if (color) {
        setTextColor(color);
        exec("foreColor", color);
      } else clearInlineStyle(["color"]);
    } else if (color) {
      setMarkColor(color);
      exec("hiliteColor", color);
    } else clearInlineStyle(["background-color"]);
  };

  const listOf = (tag: "ul" | "ol") => {
    const list = closestInEditor<HTMLElement>("ul,ol");
    return list && list.tagName.toLowerCase() === tag ? list : null;
  };

  const unChecklist = (ul: HTMLElement) => {
    ul.removeAttribute("data-type");
    ul.querySelectorAll(":scope > li").forEach((li) => li.removeAttribute("data-checked"));
  };

  const toggleBullets = () => {
    restoreSelection();
    const ul = listOf("ul");
    if (ul?.getAttribute("data-type") === "checklist") {
      unChecklist(ul);
      afterChange();
    } else exec("insertUnorderedList");
  };

  const setListStyle = (tag: "ul" | "ol", style: string) => {
    restoreSelection();
    let list = listOf(tag);
    if (!list) {
      runListCommand(tag === "ul" ? "insertUnorderedList" : "insertOrderedList");
      saveSelection();
      list = listOf(tag);
    }
    if (list) {
      if (tag === "ul") unChecklist(list);
      list.style.listStyleType = style;
      if (!list.getAttribute("style")?.trim()) list.removeAttribute("style");
    }
    afterChange();
  };

  const toggleChecklist = () => {
    restoreSelection();
    const current = listOf("ul");
    if (current?.getAttribute("data-type") === "checklist") {
      exec("insertUnorderedList");
      return;
    }
    if (!current) {
      runListCommand("insertUnorderedList");
      saveSelection();
    }
    const ul = listOf("ul");
    if (ul) {
      ul.setAttribute("data-type", "checklist");
      ul.style.removeProperty("list-style-type");
      if (!ul.getAttribute("style")?.trim()) ul.removeAttribute("style");
      ul.querySelectorAll(":scope > li").forEach((li) => {
        if (!li.hasAttribute("data-checked")) li.setAttribute("data-checked", "false");
      });
    }
    afterChange();
  };

  const formatBlock = (tag: string) => {
    restoreSelection();
    const current = closestInEditor<HTMLElement>("h1,h2,h3,h4,blockquote,pre");
    exec("formatBlock", current?.tagName.toLowerCase() === tag && tag !== "p" ? "<p>" : `<${tag}>`);
  };

  const insertInlineCode = () => {
    restoreSelection();
    const text = window.getSelection()?.toString() || "code";
    insertHtml(`<code>${escapeHtml(text)}</code>&#8203;`);
  };

  const insertTable = (rows: number, cols: number) => {
    setOpenMenu(null);
    const row = `<tr>${"<td><br></td>".repeat(cols)}</tr>`;
    insertHtml(`<table><tbody>${row.repeat(rows)}</tbody></table><div><br></div>`);
  };

  const currentCell = () => closestInEditor<HTMLTableCellElement>("td,th");

  const tableOp = (op: "rowBefore" | "rowAfter" | "rowDelete" | "colBefore" | "colAfter" | "colDelete" | "tableDelete") => {
    const cell = currentCell();
    if (!cell) {
      toast({ title: "Place the cursor inside a table first." });
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table") as HTMLTableElement;
    const index = cell.cellIndex;
    const newCell = (tag = "TD") => {
      const c = document.createElement(tag.toLowerCase());
      c.innerHTML = "<br>";
      return c;
    };
    switch (op) {
      case "rowBefore":
      case "rowAfter": {
        const tr = document.createElement("tr");
        Array.from(row.cells).forEach((c) => tr.appendChild(newCell(c.tagName)));
        row.parentElement?.insertBefore(tr, op === "rowBefore" ? row : row.nextSibling);
        break;
      }
      case "rowDelete":
        if (table.rows.length <= 1) table.remove();
        else row.remove();
        break;
      case "colBefore":
      case "colAfter":
        Array.from(table.rows).forEach((r) => {
          const ref = r.cells[Math.min(index, r.cells.length - 1)];
          r.insertBefore(newCell(ref?.tagName), op === "colBefore" ? ref ?? null : ref?.nextSibling ?? null);
        });
        break;
      case "colDelete":
        if (row.cells.length <= 1) table.remove();
        else Array.from(table.rows).forEach((r) => r.cells[index]?.remove());
        break;
      case "tableDelete":
        table.remove();
        break;
    }
    if (!cell.isConnected) savedRange.current = null;
    emit();
  };

  const insertImage = (src: string, alt = "", width = "") => {
    const w = parseInt(width, 10);
    const style = w > 0 ? ` style="width:${w}px;max-width:100%"` : "";
    insertHtml(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${style}>`);
  };

  const insertImageFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        insertImage(await imageFileToDataUrl(file), file.name.replace(/\.[^.]+$/, ""));
      } catch (err: any) {
        toast({ title: "Image not added", description: err?.message || "Could not read the image.", variant: "destructive" });
      }
    }
  };

  const clearFormatting = () => {
    exec("removeFormat");
    clearInlineStyle(["color", "background-color", "font-family", "font-size"]);
  };

  /* ------------------------------ dialogs ----------------------------- */

  const leaveFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  };

  const openLinkDialog = async () => {
    await leaveFullscreen();
    const anchor = closestInEditor<HTMLAnchorElement>("a");
    linkTarget.current = anchor;
    const selected = savedRange.current?.toString() || "";
    setLinkForm({
      url: anchor?.getAttribute("href") || "",
      text: anchor ? anchor.textContent || "" : selected,
      newTab: anchor ? anchor.target === "_blank" : true,
    });
    setLinkOpen(true);
  };

  const saveLink = () => {
    const url = normalizeUrl(linkForm.url);
    if (!url) {
      toast({ title: "Enter a valid link URL", variant: "destructive" });
      return;
    }
    const text = linkForm.text.trim() || url;
    const anchor = linkTarget.current;
    if (anchor && insideEditor(anchor)) {
      anchor.setAttribute("href", url);
      if (anchor.textContent !== text) anchor.textContent = text;
      if (linkForm.newTab) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      } else {
        anchor.removeAttribute("target");
        anchor.removeAttribute("rel");
      }
      emit();
    } else {
      const target = linkForm.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      insertHtml(`<a href="${escapeHtml(url)}"${target}>${escapeHtml(text)}</a>&nbsp;`);
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    restoreSelection();
    const anchor = closestInEditor<HTMLAnchorElement>("a");
    if (anchor && savedRange.current?.collapsed) {
      const range = document.createRange();
      range.selectNodeContents(anchor);
      savedRange.current = range;
    }
    exec("unlink");
  };

  const openImageDialog = async () => {
    await leaveFullscreen();
    setImageForm({ src: "", alt: "", width: "" });
    setImageOpen(true);
  };

  const saveImage = () => {
    const src = imageForm.src.startsWith("data:image/") ? imageForm.src : normalizeUrl(imageForm.src);
    if (!src) {
      toast({ title: "Choose an image or enter an image URL", variant: "destructive" });
      return;
    }
    insertImage(src, imageForm.alt, imageForm.width);
    setImageOpen(false);
  };

  const openSource = async () => {
    await leaveFullscreen();
    setSourceText(editorRef.current?.innerHTML || "");
    setSourceOpen(true);
  };

  const saveSource = () => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = sanitizeRichHtml(sourceText);
      savedRange.current = null;
      emit();
    }
    setSourceOpen(false);
  };

  const openPreview = async () => {
    await leaveFullscreen();
    setPreviewOpen(true);
  };

  const openWordCount = async () => {
    await leaveFullscreen();
    setCountOpen(true);
  };

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) await leaveFullscreen();
    else await el.requestFullscreen?.().catch(() => toast({ title: "Fullscreen is not available in this browser." }));
  };

  const printContent = () => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) return frame.remove();
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#111;padding:24px}
        img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}
        blockquote{border-left:3px solid #ccc;margin:8px 0;padding-left:12px;color:#555}pre{background:#f5f5f5;padding:8px;white-space:pre-wrap}
        ul[data-type=checklist]{list-style:none;padding-left:4px}ul[data-type=checklist]>li::before{content:"\\2610  "}ul[data-type=checklist]>li[data-checked=true]::before{content:"\\2611  "}
      </style></head><body>${sanitizeRichHtml(editorRef.current?.innerHTML || "")}</body></html>`
    );
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      exec("insertText", text);
    } catch {
      toast({ title: "Use Ctrl+V to paste", description: "The browser blocked clipboard access from the menu." });
    }
  };

  const insertDateTime = (kind: "date" | "time" | "both") => {
    const now = new Date();
    const text = kind === "date" ? now.toLocaleDateString() : kind === "time" ? now.toLocaleTimeString() : now.toLocaleString();
    exec("insertText", text);
  };

  const newDocument = () => {
    exec("selectAll");
    exec("delete");
  };

  /* ------------------------------- voice ------------------------------ */

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice typing is not supported in this browser." });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) exec("insertText", `${finalText.trim()} `);
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setIsRecording(false);
    }
  };

  /* ------------------------------ events ------------------------------ */

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      saveSelection();
      openLinkDialog();
      return;
    }
    if (mod && e.key.toLowerCase() === "s" && e.shiftKey) {
      e.preventDefault();
      exec("strikeThrough");
      return;
    }
    if (e.key === "Tab" && closestInEditor("li")) {
      e.preventDefault();
      exec(e.shiftKey ? "outdent" : "indent");
      return;
    }
    if (e.key === "Enter" && closestInEditor('ul[data-type="checklist"] > li')) {
      // A new checklist item starts unchecked even if the item it was split from was checked.
      setTimeout(() => {
        saveSelection();
        const li = closestInEditor<HTMLLIElement>("li");
        if (li?.parentElement?.getAttribute("data-type") === "checklist") li.setAttribute("data-checked", "false");
        emit();
      }, 0);
    }
  };

  const onEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const li = (e.target as HTMLElement).closest?.("li");
    if (!li || li.parentElement?.getAttribute("data-type") !== "checklist" || !insideEditor(li)) return;
    if (e.clientX - li.getBoundingClientRect().left <= 24) {
      li.setAttribute("data-checked", li.getAttribute("data-checked") === "true" ? "false" : "true");
      emit();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const images = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (images.length) {
      e.preventDefault();
      saveSelection();
      insertImageFiles(images);
      return;
    }
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      saveSelection();
      insertHtml(sanitizeRichHtml(html, { forPaste: true }));
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const images = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    e.preventDefault();
    const doc = document as any;
    const range: Range | null = doc.caretRangeFromPoint?.(e.clientX, e.clientY) ?? null;
    if (range && insideEditor(range.startContainer)) savedRange.current = range;
    insertImageFiles(images);
  };

  /* ------------------------------- render ------------------------------ */

  const menuTrigger = (id: string, label: string) => (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        onMouseDown={() => saveSelection()}
        className={cn(
          "px-2.5 h-7 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors",
          openMenu === id && "bg-slate-200 text-slate-900"
        )}
      >
        {label}
      </button>
    </DropdownMenuTrigger>
  );

  const menuProps = (id: string) => ({
    open: openMenu === id,
    onOpenChange: (o: boolean) => setOpenMenu(o ? id : null),
  });

  const contentProps = { container: portal, onCloseAutoFocus: keepFocus, className: "min-w-[200px] text-xs rounded-xl" };
  const item = "text-xs gap-2 cursor-pointer";
  const inTable = !!currentCell();

  const colorButton = (kind: "text" | "mark") => {
    const current = kind === "text" ? textColor : markColor;
    return (
      <div className="flex items-center">
        <ToolButton title={kind === "text" ? "Text color" : "Background color"} onClick={() => applyColor(kind, current)} className="w-7 rounded-r-none">
          <span className="flex flex-col items-center">
            {kind === "text" ? <Baseline className="h-4 w-4 opacity-80" /> : <Highlighter className="h-4 w-4 opacity-80" />}
            <span className="h-[3px] w-4 rounded-full -mt-0.5" style={{ backgroundColor: current }} />
          </span>
        </ToolButton>
        <Popover {...menuProps(`color-${kind}`)}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={kind === "text" ? "Text color options" : "Background color options"}
              onMouseDown={(e) => e.preventDefault()}
              className={cn("h-8 w-4 rounded-lg rounded-l-none hover:bg-slate-200", openMenu === `color-${kind}` && "bg-slate-200")}
            >
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent container={portal} onOpenAutoFocus={keepFocus} onCloseAutoFocus={keepFocus} align="start" className="w-auto p-2 rounded-xl">
            <div className="grid grid-cols-5 overflow-hidden rounded-lg">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyColor(kind, c);
                    setOpenMenu(null);
                  }}
                  className="h-7 w-9 hover:scale-110 hover:z-10 hover:shadow transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between px-0.5">
              <button
                type="button"
                title="Black"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyColor(kind, "#000000");
                  setOpenMenu(null);
                }}
                className="h-7 w-7 rounded bg-black"
              />
              <button
                type="button"
                title="Remove color"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyColor(kind, null);
                  setOpenMenu(null);
                }}
                className="relative h-7 w-7 rounded border border-slate-200 bg-white overflow-hidden"
              >
                <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-red-500" />
              </button>
              <label title="Custom color" className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-100 cursor-pointer">
                <Palette className="h-4 w-4 text-slate-700" />
                <input
                  type="color"
                  className="sr-only"
                  defaultValue={current}
                  onChange={(e) => applyColor(kind, e.target.value)}
                />
              </label>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const listButton = (tag: "ul" | "ol") => (
    <div className="flex items-center">
      <ToolButton
        title={tag === "ul" ? "Bullet list" : "Numbered list"}
        active={tag === "ul" ? active.insertUnorderedList : active.insertOrderedList}
        onClick={tag === "ul" ? toggleBullets : () => exec("insertOrderedList")}
        className="w-7 rounded-r-none"
      >
        {tag === "ul" ? <List className="h-3.5 w-3.5 opacity-60" /> : <ListOrdered className="h-3.5 w-3.5 opacity-60" />}
      </ToolButton>
      <DropdownMenu {...menuProps(`list-${tag}`)} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" title="List style" onMouseDown={() => saveSelection()} className="h-8 w-4 rounded-lg rounded-l-none hover:bg-slate-200">
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent {...contentProps} className="min-w-[150px] text-xs rounded-xl" align="start">
          {(tag === "ul" ? BULLET_STYLES : NUMBER_STYLES).map(([label, style, marker]) => (
            <DropdownMenuItem key={label} className={item} onSelect={() => setListStyle(tag, style)}>
              <span className="w-8 text-slate-400" style={{ fontFamily: "serif" }}>{marker}</span>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "rte-root rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/10 transition-shadow",
        isFullscreen && "rounded-none border-0 h-screen w-screen",
        className
      )}
    >
      {!hideMenubar && (
        <div className="flex items-center gap-0.5 px-2 py-1 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
          <DropdownMenu {...menuProps("file")} modal={false}>
            {menuTrigger("file", "File")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={newDocument}><Type className="h-3.5 w-3.5" />New document</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={openPreview}><Eye className="h-3.5 w-3.5" />Preview</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={printContent}><Printer className="h-3.5 w-3.5" />Print<DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("edit")} modal={false}>
            {menuTrigger("edit", "Edit")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={() => exec("undo")}><Undo2 className="h-3.5 w-3.5" />Undo<DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("redo")}><Redo2 className="h-3.5 w-3.5" />Redo<DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onSelect={() => exec("cut")}>Cut<DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("copy")}>Copy<DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={pasteFromClipboard}>Paste<DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onSelect={() => exec("selectAll")}>Select all<DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("view")} modal={false}>
            {menuTrigger("view", "View")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={openSource}><FileCode2 className="h-3.5 w-3.5" />Source code</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={openPreview}><Eye className="h-3.5 w-3.5" />Preview</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem className="text-xs cursor-pointer" checked={showBlocks} onCheckedChange={(v) => setShowBlocks(!!v)}>Show blocks</DropdownMenuCheckboxItem>
              {typeof document !== "undefined" && document.fullscreenEnabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={item} onSelect={toggleFullscreen}>
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("insert")} modal={false}>
            {menuTrigger("insert", "Insert")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={openImageDialog}><ImageIcon className="h-3.5 w-3.5" />Image...</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={openLinkDialog}><Link2 className="h-3.5 w-3.5" />Link...<DropdownMenuShortcut>Ctrl+K</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2"><TableIcon className="h-3.5 w-3.5" />Table</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl"><TableGridPicker onPick={insertTable} /></DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className={item} onSelect={toggleChecklist}><CheckSquare className="h-3.5 w-3.5" />Checklist</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => formatBlock("pre")}><Code className="h-3.5 w-3.5" />Code block</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("insertHorizontalRule")}><Minus className="h-3.5 w-3.5" />Horizontal line</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2 pl-[30px]">Date/time</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  <DropdownMenuItem className={item} onSelect={() => insertDateTime("date")}>Date</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => insertDateTime("time")}>Time</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => insertDateTime("both")}>Date and time</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("format")} modal={false}>
            {menuTrigger("format", "Format")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={() => exec("bold")}><Bold className="h-3.5 w-3.5" />Bold<DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("italic")}><Italic className="h-3.5 w-3.5" />Italic<DropdownMenuShortcut>Ctrl+I</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("underline")}><Underline className="h-3.5 w-3.5" />Underline<DropdownMenuShortcut>Ctrl+U</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("strikeThrough")}><Strikethrough className="h-3.5 w-3.5" />Strikethrough</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("superscript")}><Superscript className="h-3.5 w-3.5" />Superscript</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={() => exec("subscript")}><Subscript className="h-3.5 w-3.5" />Subscript</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={insertInlineCode}><Code className="h-3.5 w-3.5" />Code</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2 pl-[30px]">Blocks</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl min-w-[160px]">
                  {BLOCKS.map(([label, tag]) => (
                    <DropdownMenuItem key={tag} className={item} onSelect={() => formatBlock(tag)}>{label}</DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2 pl-[30px]">Align</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  <DropdownMenuItem className={item} onSelect={() => exec("justifyLeft")}><AlignLeft className="h-3.5 w-3.5" />Left</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => exec("justifyCenter")}><AlignCenter className="h-3.5 w-3.5" />Center</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => exec("justifyRight")}><AlignRight className="h-3.5 w-3.5" />Right</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => exec("justifyFull")}><AlignJustify className="h-3.5 w-3.5" />Justify</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onSelect={clearFormatting}><RemoveFormatting className="h-3.5 w-3.5" />Clear formatting</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("tools")} modal={false}>
            {menuTrigger("tools", "Tools")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuItem className={item} onSelect={openSource}><FileCode2 className="h-3.5 w-3.5" />Source code</DropdownMenuItem>
              <DropdownMenuItem className={item} onSelect={openWordCount}><Type className="h-3.5 w-3.5" />Word count</DropdownMenuItem>
              <DropdownMenuCheckboxItem className="text-xs cursor-pointer" checked={spellcheck} onCheckedChange={(v) => setSpellcheck(!!v)}>Spellcheck</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu {...menuProps("table")} modal={false}>
            {menuTrigger("table", "Table")}
            <DropdownMenuContent {...contentProps} align="start">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2"><TableIcon className="h-3.5 w-3.5" />Insert table</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl"><TableGridPicker onPick={insertTable} /></DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!inTable} className="text-xs gap-2 pl-[30px]">Row</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  <DropdownMenuItem className={item} onSelect={() => tableOp("rowBefore")}>Insert row before</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => tableOp("rowAfter")}>Insert row after</DropdownMenuItem>
                  <DropdownMenuItem className={cn(item, "text-red-600")} onSelect={() => tableOp("rowDelete")}>Delete row</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!inTable} className="text-xs gap-2 pl-[30px]">Column</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl">
                  <DropdownMenuItem className={item} onSelect={() => tableOp("colBefore")}>Insert column before</DropdownMenuItem>
                  <DropdownMenuItem className={item} onSelect={() => tableOp("colAfter")}>Insert column after</DropdownMenuItem>
                  <DropdownMenuItem className={cn(item, "text-red-600")} onSelect={() => tableOp("colDelete")}>Delete column</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!inTable} className={cn(item, "text-red-600")} onSelect={() => tableOp("tableDelete")}>Delete table</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Toolbar Tier 1 */}
      <div className="flex items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-1">
          <ToolButton title="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Undo2 className="h-4 w-4 opacity-70" /></ToolButton>
          <ToolButton title="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Redo2 className="h-4 w-4 opacity-70" /></ToolButton>
        </div>
        <Divider />
        <DropdownMenu {...menuProps("font")} modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" onMouseDown={() => saveSelection()} className="h-8 w-[130px] px-3 flex items-center justify-between rounded-lg text-xs font-semibold hover:bg-slate-200">
              <span className="truncate">{fontLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent {...contentProps} align="start" className="min-w-[180px] max-h-72 overflow-y-auto rounded-xl">
            {FONTS.map(([name, family]) => (
              <DropdownMenuItem key={name} className={cn(item, "text-sm", fontLabel === name && "bg-primary/10 text-primary")} style={{ fontFamily: family || undefined }} onSelect={() => applyFont(family)}>
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Divider />
        <DropdownMenu {...menuProps("size")} modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" onMouseDown={() => saveSelection()} className="h-8 w-[60px] px-3 flex items-center justify-between rounded-lg text-xs font-semibold hover:bg-slate-200">
              {sizeLabel}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent {...contentProps} align="start" className="min-w-[80px] max-h-72 overflow-y-auto rounded-xl">
            {FONT_SIZES.map((s) => (
              <DropdownMenuItem key={s} className={cn(item, sizeLabel === String(s) && "bg-primary/10 text-primary")} onSelect={() => applyFontSize(s)}>
                {s}pt
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Divider />
        <div className="flex items-center gap-0.5">
          <ToolButton title="Bold (Ctrl+B)" active={active.bold} onClick={() => exec("bold")}><Bold className="h-4 w-4 opacity-80" /></ToolButton>
          <ToolButton title="Italic (Ctrl+I)" active={active.italic} onClick={() => exec("italic")}><Italic className="h-4 w-4 opacity-80" /></ToolButton>
          <ToolButton title="Underline (Ctrl+U)" active={active.underline} onClick={() => exec("underline")}><Underline className="h-4 w-4 opacity-80" /></ToolButton>
          <ToolButton title="Strikethrough" active={active.strikeThrough} onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4 opacity-80" /></ToolButton>
        </div>
        <Divider />
        <div className="flex items-center gap-0.5">
          {colorButton("mark")}
          {colorButton("text")}
        </div>
        <Divider />
        <div className="flex items-center gap-0.5">
          <ToolButton title="Insert link (Ctrl+K)" onClick={openLinkDialog}><Link2 className="h-4 w-4 opacity-70" /></ToolButton>
          <ToolButton title="Insert image" onClick={openImageDialog}><ImageIcon className="h-4 w-4 opacity-70" /></ToolButton>
        </div>
        <Popover {...menuProps("more")}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="More"
              onMouseDown={(e) => e.preventDefault()}
              className={cn("h-8 w-8 rounded-lg hover:bg-slate-200 transition-colors ml-auto", openMenu === "more" && "bg-primary/10 text-primary")}
            >
              <MoreHorizontal className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent container={portal} onOpenAutoFocus={keepFocus} onCloseAutoFocus={keepFocus} align="end" className="w-auto p-2 rounded-xl">
            <div className="flex items-center gap-0.5">
              <ToolButton title="Superscript" active={active.superscript} onClick={() => exec("superscript")}><Superscript className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Subscript" active={active.subscript} onClick={() => exec("subscript")}><Subscript className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Inline code" onClick={insertInlineCode}><Code className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Blockquote" onClick={() => formatBlock("blockquote")}><Quote className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Horizontal line" onClick={() => exec("insertHorizontalRule")}><Minus className="h-4 w-4 opacity-70" /></ToolButton>
              <Divider />
              <ToolButton title="Remove link" onClick={removeLink}><Unlink className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Clear formatting" onClick={clearFormatting}><RemoveFormatting className="h-4 w-4 opacity-70" /></ToolButton>
            </div>
            <div className="h-px bg-slate-100 my-1.5" />
            <div className="flex items-center gap-0.5">
              <ToolButton title="Source code" onClick={() => { setOpenMenu(null); openSource(); }}><FileCode2 className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Preview" onClick={() => { setOpenMenu(null); openPreview(); }}><Eye className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Print" onClick={() => { setOpenMenu(null); printContent(); }}><Printer className="h-4 w-4 opacity-70" /></ToolButton>
              <ToolButton title="Word count" onClick={() => { setOpenMenu(null); openWordCount(); }}><Type className="h-4 w-4 opacity-70" /></ToolButton>
              {typeof document !== "undefined" && document.fullscreenEnabled && (
                <ToolButton title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => { setOpenMenu(null); toggleFullscreen(); }}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4 opacity-70" /> : <Maximize2 className="h-4 w-4 opacity-70" />}
                </ToolButton>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Toolbar Tier 2 */}
      <div className="flex items-center gap-2 p-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-0.5 ml-2">
          <ToolButton title="Align left" active={active.justifyLeft} onClick={() => exec("justifyLeft")}><AlignLeft className="h-3.5 w-3.5 opacity-60" /></ToolButton>
          <ToolButton title="Align center" active={active.justifyCenter} onClick={() => exec("justifyCenter")}><AlignCenter className="h-3.5 w-3.5 opacity-60" /></ToolButton>
          <ToolButton title="Align right" active={active.justifyRight} onClick={() => exec("justifyRight")}><AlignRight className="h-3.5 w-3.5 opacity-60" /></ToolButton>
          <ToolButton title="Justify" active={active.justifyFull} onClick={() => exec("justifyFull")}><AlignJustify className="h-3.5 w-3.5 opacity-60" /></ToolButton>
        </div>
        <Divider />
        <div className="flex items-center gap-0.5">
          {listButton("ul")}
          {listButton("ol")}
        </div>
        <Divider />
        <ToolButton title="Checklist" active={active.checklist} onClick={toggleChecklist}><CheckSquare className="h-3.5 w-3.5 opacity-60" /></ToolButton>
        <Divider />
        <div className="flex items-center gap-0.5">
          <ToolButton title="Decrease indent" onClick={() => exec("outdent")}><IndentDecrease className="h-3.5 w-3.5 opacity-60" /></ToolButton>
          <ToolButton title="Increase indent" onClick={() => exec("indent")}><IndentIncrease className="h-3.5 w-3.5 opacity-60" /></ToolButton>
        </div>
        <Divider />
        <DropdownMenu {...menuProps("table-quick")} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" title="Table" onMouseDown={() => saveSelection()} className="h-8 w-8 rounded-lg hover:bg-slate-200">
              <TableIcon className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent {...contentProps} align="start" className="w-auto rounded-xl">
            <TableGridPicker onPick={insertTable} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Writing area */}
      <div className={cn("relative bg-white", isFullscreen && "flex-1 overflow-y-auto")}>
        {isEmpty && (
          <div className="pointer-events-none absolute left-6 top-6 right-6 text-sm font-medium text-muted-foreground select-none">{placeholder}</div>
        )}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          spellCheck={spellcheck}
          onInput={afterChange}
          onKeyDown={onKeyDown}
          onKeyUp={afterSelect}
          onMouseUp={afterSelect}
          onFocus={afterSelect}
          onClick={onEditorClick}
          onPaste={onPaste}
          onDrop={onDrop}
          onBlur={saveSelection}
          className={cn(
            "rte-content rte-editable p-6 text-sm leading-relaxed font-medium text-slate-800 outline-none overflow-y-auto",
            !disableVoice && "pb-14",
            showBlocks && "rte-show-blocks",
            isFullscreen && "min-h-full max-w-4xl mx-auto"
          )}
          style={{ minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}
        />
        {!disableVoice && (
          <Button
            type="button"
            size="sm"
            variant={isRecording ? "destructive" : "outline"}
            className="absolute bottom-2 left-2 h-8 rounded-lg gap-2 shadow-sm"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={toggleVoice}
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice</span>
              </>
            )}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const src = await imageFileToDataUrl(file);
            setImageForm((p) => ({ ...p, src, alt: p.alt || file.name.replace(/\.[^.]+$/, "") }));
          } catch (err: any) {
            toast({ title: "Image not added", description: err?.message, variant: "destructive" });
          }
        }}
      />

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md rounded-xl" onCloseAutoFocus={keepFocus}>
          <DialogHeader>
            <DialogTitle>Insert/Edit Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">URL</Label>
              <Input autoFocus placeholder="https://example.com" value={linkForm.url} onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), saveLink())} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Text to display</Label>
              <Input value={linkForm.text} onChange={(e) => setLinkForm((p) => ({ ...p, text: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), saveLink())} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={linkForm.newTab} onCheckedChange={(v) => setLinkForm((p) => ({ ...p, newTab: !!v }))} />
              Open link in a new tab
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveLink}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-md rounded-xl" onCloseAutoFocus={keepFocus}>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Source</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL or upload"
                  value={imageForm.src.startsWith("data:") ? "Uploaded image" : imageForm.src}
                  readOnly={imageForm.src.startsWith("data:")}
                  onChange={(e) => setImageForm((p) => ({ ...p, src: e.target.value }))}
                />
                <Button type="button" variant="outline" size="icon" title="Upload from computer" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {imageForm.src && (
              <div className="rounded-lg border border-slate-200 p-2 flex justify-center bg-slate-50">
                <img src={imageForm.src} alt="" className="max-h-40 max-w-full object-contain" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Alternative description</Label>
                <Input value={imageForm.alt} onChange={(e) => setImageForm((p) => ({ ...p, alt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Width (px)</Label>
                <Input type="number" min={16} placeholder="Auto" value={imageForm.width} onChange={(e) => setImageForm((p) => ({ ...p, width: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveImage}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source code dialog */}
      <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
        <DialogContent className="max-w-3xl rounded-xl" onCloseAutoFocus={keepFocus}>
          <DialogHeader>
            <DialogTitle>Source Code</DialogTitle>
          </DialogHeader>
          <Textarea disableVoice value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="min-h-[360px] font-mono text-xs bg-slate-50" />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setSourceOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveSource}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl" onCloseAutoFocus={keepFocus}>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <RichTextContent value={previewOpen ? lastHtml.current : ""} className="text-sm leading-relaxed" empty={<p className="text-sm text-muted-foreground italic">Nothing written yet.</p>} />
        </DialogContent>
      </Dialog>

      {/* Word count dialog */}
      <Dialog open={countOpen} onOpenChange={setCountOpen}>
        <DialogContent className="max-w-sm rounded-xl" onCloseAutoFocus={keepFocus}>
          <DialogHeader>
            <DialogTitle>Word Count</DialogTitle>
          </DialogHeader>
          {(() => {
            const text = (editorRef.current?.innerText || "").replace(/​/g, "");
            const rows: [string, number][] = [
              ["Words", text.trim() ? text.trim().split(/\s+/).length : 0],
              ["Characters (no spaces)", text.replace(/\s/g, "").length],
              ["Characters", text.replace(/\n/g, "").length],
            ];
            return (
              <div className="divide-y divide-slate-100 text-sm">
                {rows.map(([label, n]) => (
                  <div key={label} className="flex justify-between py-2">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold">{n}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
