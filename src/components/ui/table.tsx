import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// The app-wide table design (matches Setup → Staff / the shared DataTable):
// bordered rounded card, muted header with small uppercase semibold labels,
// drag-resizable columns, vertical column dividers, compact 12.5px cells,
// soft row hover, and a "Showing x to y of z entries" footer with ‹ 1 2 3 ›.
// Every on-screen table (CRM + HRMS) renders through these primitives, so the
// look is changed here once. Pages should pass only layout classes (width,
// alignment, sticky, whitespace) — not their own colours/fonts/padding.

// Card shell around a table (+ optional TablePagination footer).
const TableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full bg-card border rounded-lg overflow-hidden shadow-sm", className)} {...props} />
  ),
);
TableContainer.displayName = "TableContainer";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn("relative w-full overflow-auto", wrapperClassName)}>
      <table ref={ref} className={cn("w-full caption-bottom text-[12.5px]", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-muted/50 [&_tr]:border-b [&_tr:hover]:bg-transparent", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("text-foreground [&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/30 font-semibold [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors hover:bg-muted/20 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const MIN_COLUMN_WIDTH = 48;

// Row-select columns (a cell whose direct child is a checkbox — Radix
// <Checkbox> or a native input) are a fixed, compact 44px with the checkbox
// centred, on every table, regardless of the width class a page passed.
const SELECT_CELL =
  "[&:has(>[role=checkbox])]:w-11 [&:has(>[role=checkbox])]:min-w-11 [&:has(>[role=checkbox])]:max-w-11 [&:has(>[role=checkbox])]:px-0 [&:has(>[role=checkbox])]:text-center " +
  "[&:has(>input[type=checkbox])]:w-11 [&:has(>input[type=checkbox])]:min-w-11 [&:has(>input[type=checkbox])]:max-w-11 [&:has(>input[type=checkbox])]:px-0 [&:has(>input[type=checkbox])]:text-center " +
  "[&>[role=checkbox]]:align-middle [&>input[type=checkbox]]:align-middle";

// True when the header holds only a checkbox (select-all) — no label.
const isSelectHeader = (children: React.ReactNode, label: string) => {
  if (label.trim()) return false;
  const only = React.Children.toArray(children);
  if (only.length !== 1 || !React.isValidElement(only[0])) return false;
  const props = only[0].props as Record<string, unknown>;
  return "checked" in props || props.type === "checkbox" || "onCheckedChange" in props;
};

// Content-aware default column widths, inferred from the header label so every
// table gets sensible sizing without per-page tuning. `wrap` columns (address,
// notes…) get a fixed comfortable width and their text wraps onto more lines;
// the others are sized so typical values fit on one line. Order matters:
// first match wins (e.g. "Created By" is a person, not a date).
type ColumnPreset = { width: number; minWidth: number };
const COLUMN_PRESETS: Array<[RegExp, ColumnPreset]> = [
  // Actions / row number
  [/^(actions?|options|manage|operations?)$/, { width: 110, minWidth: 90 }],
  [/^(#|sr\.?|s\.?\s?no\.?|sl\.?\s?no\.?|no\.?|id)$/, { width: 64, minWidth: 56 }],
  // Contact details (single line)
  [/e-?mail/, { width: 230, minWidth: 190 }],
  [/phone|mobile|whatsapp|contact\s*(no|number)|telephone|^tel$/, { width: 145, minWidth: 130 }],
  // Document numbers / codes (INV-0001, EMP-12…)
  [/#$|\bnumber$|^code$|code$|\bref(erence)?(\s*no\.?)?$|\bno\.?$/, { width: 120, minWidth: 100 }],
  // Long free text — fixed comfortable width, text wraps onto more lines
  [/address|location|description|^notes?$|remarks?|message|comments?|details|reason|purpose|feedback|summary|requirement|enquiry/, { width: 280, minWidth: 220 }],
  // Money / numbers
  [/amount|total|value|price|rate$|balance|salary|spend|cost|tax|paid|payable|discount|revenue|budget|fee|incentive|cpl|burning/, { width: 130, minWidth: 110 }],
  [/^(qty|quantity|count|units?|leads?|days|hours?)$|^no\.?\s*of/, { width: 95, minWidth: 80 }],
  // People
  [/(created|added|converted|updated|approved|assigned|requested)\s*by|^assigned( to)?$|owner|sales\s*person|salesperson|agent|^remind/, { width: 165, minWidth: 140 }],
  [/name$|^(customer|client|company|lead|staff|employee|vendor|supplier|patient|member|user|contact|admin)s?$/, { width: 190, minWidth: 160 }],
  // Titles / things
  [/^(subject|title|project|task|item|product|service|treatment|template|campaign|form|plan|course)s?( name| title)?$/, { width: 200, minWidth: 160 }],
  // Dates / times (single line)
  [/date|created|updated|due$|expir|^start|^end|time|last\s*(login|contact|seen|activity)|joined|deadline|follow|period|month|year|schedule|^when$|^day$/, { width: 150, minWidth: 125 }],
  // Short labels / badges
  [/status|stage|priority|type$|source|role|category|mode|gender|department|designation|branch|group|level|visibility|plan|^state$|active|enabled|public|conversion/, { width: 140, minWidth: 115 }],
  [/tags?$|labels?$/, { width: 170, minWidth: 140 }],
  [/city|country|zip|pin\s*code|postal/, { width: 130, minWidth: 110 }],
  [/website|url|link|domain/, { width: 200, minWidth: 160 }],
];

const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
};

const presetFor = (label: string): ColumnPreset | null => {
  const key = label.replace(/[*:()]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (!key) return null;
  for (const [re, preset] of COLUMN_PRESETS) if (re.test(key)) return preset;
  return null;
};

// Width utility / explicit style from the page means the page already decided.
const hasExplicitWidth = (className?: string, style?: React.CSSProperties) =>
  !!(style?.width || style?.minWidth || /(^|\s)(min-|max-)?w-/.test(className || ""));

// Header cell with a drag handle on its right edge: drag to resize the column,
// double-click the handle to reset it to its default. Pass resizable={false}
// to opt out (e.g. checkbox columns) and autoWidth={false} to skip the
// content-based default width.
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { resizable?: boolean; autoWidth?: boolean }
>(({ className, children, resizable = true, autoWidth = true, style, ...props }, ref) => {
  const label = textOf(children);
  const selectColumn = isSelectHeader(children, label);
  if (selectColumn) {
    resizable = false;
    autoWidth = false;
  }
  const preset = React.useMemo(
    () => (autoWidth && !hasExplicitWidth(className, style) ? presetFor(label) : null),
    [autoWidth, className, style, label],
  );
  const presetStyle: React.CSSProperties | undefined = preset
    ? { width: preset.width, minWidth: preset.minWidth }
    : undefined;

  const thRef = React.useRef<HTMLTableCellElement | null>(null);
  const setRefs = (el: HTMLTableCellElement | null) => {
    thRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLTableCellElement | null>).current = el;
  };

  const startResize = (e: React.PointerEvent<HTMLSpanElement>) => {
    const th = thRef.current;
    if (!th || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const width = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + ev.clientX - startX));
      th.style.width = `${width}px`;
      th.style.minWidth = `${width}px`;
      th.style.maxWidth = `${width}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      // Swallow the click that follows the drag so it doesn't trigger the
      // header's sort handler.
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resetWidth = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const th = thRef.current;
    if (!th) return;
    th.style.width = preset ? `${preset.width}px` : (style?.width as string) ?? "";
    th.style.minWidth = preset ? `${preset.minWidth}px` : (style?.minWidth as string) ?? "";
    th.style.maxWidth = "";
  };

  return (
    <th
      ref={setRefs}
      className={cn(
        "relative h-11 py-2.5 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-foreground whitespace-nowrap overflow-hidden text-ellipsis border-r last:border-r-0",
        className,
        SELECT_CELL,
      )}
      style={presetStyle ? { ...presetStyle, ...style } : style}
      {...props}
    >
      {children}
      {resizable && (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
          title="Drag to resize · double-click to reset"
          onPointerDown={startResize}
          onDoubleClick={resetWidth}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-primary/40 active:bg-primary/60"
        />
      )}
    </th>
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "py-2.5 px-4 align-middle text-[12.5px] border-r last:border-r-0 [&_.text-sm]:text-[12.5px] [&_.text-base]:text-[13.5px]",
        className,
        SELECT_CELL,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

// Standard "nothing to show" row spanning the whole table.
const TableEmpty = ({
  colSpan,
  children = "No records found.",
  className,
}: {
  colSpan: number;
  children?: React.ReactNode;
  className?: string;
}) => (
  <tr className="hover:bg-transparent">
    <td colSpan={colSpan} className={cn("h-32 px-4 text-center text-muted-foreground italic", className)}>
      {children}
    </td>
  </tr>
);
TableEmpty.displayName = "TableEmpty";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

// Footer used under every table: "Showing x to y of z entries" + compact
// ‹ 1 2 3 › arrow pagination. `page` is 1-based. Renders nothing when total is 0.
function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  // Window of up to 5 page buttons around the current page.
  const first = Math.max(1, Math.min(current - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => first + i);

  const btn =
    "h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className={cn("px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30", className)}>
      <div className="text-xs text-muted-foreground font-medium">
        Showing <span className="text-foreground font-semibold">{start}</span> to{" "}
        <span className="text-foreground font-semibold">{end}</span> of{" "}
        <span className="text-foreground font-semibold">{total}</span> entries
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          aria-label="Previous page"
          className={cn(btn, "text-muted-foreground hover:bg-accent")}
          disabled={current === 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === current ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              btn,
              p === current
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          className={cn(btn, "text-muted-foreground hover:bg-accent")}
          disabled={current === totalPages}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

export {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
  TableCaption,
  TablePagination,
};
