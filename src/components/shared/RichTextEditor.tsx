import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  MoreVertical,
  Undo, 
  Redo, 
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorProps {
  placeholder?: string;
  value?: string;
  onChange?: (content: string) => void;
}

export const RichTextEditor = ({ placeholder, value, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [currentFont, setCurrentFont] = useState("System Font");
  const [currentSize, setCurrentSize] = useState("12pt");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      if (value !== undefined && value !== "") {
        if (!isInitialized) {
          editorRef.current.innerHTML = value;
          setIsInitialized(true);
        }
      } else if (value === "" || value === undefined) {
        editorRef.current.innerHTML = "";
        setIsInitialized(false);
      }
    }
  }, [value, isInitialized]);

  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
    });
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    checkActiveFormats();
  };

  const handleFontChange = (val: string, label: string) => {
    setCurrentFont(label);
    execCommand("fontName", val);
  };

  const handleSizeChange = (val: string, label: string) => {
    setCurrentSize(label);
    execCommand("fontSize", val);
  };

  const handleLink = () => {
    const url = prompt("Enter link URL:", "https://");
    if (url) execCommand("createLink", url);
  };

  const handleImage = () => {
    const url = prompt("Enter image URL:", "https://");
    if (url) execCommand("insertImage", url);
  };

  return (
    <div className="border border-border/50 rounded-xl shadow-sm bg-background flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      {/* Google Docs style Top Menu Bar */}
      <div className="flex gap-2 px-4 py-2 border-b bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider overflow-x-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-primary transition-colors cursor-pointer select-none">File</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => { if(editorRef.current) editorRef.current.innerHTML = ""; checkActiveFormats(); }}>New</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-primary transition-colors cursor-pointer select-none">Edit</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => execCommand("undo")}>Undo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("redo")}>Redo</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("selectAll")}>Select All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-primary transition-colors cursor-pointer select-none">Insert</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={handleImage}>Image</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLink}>Link</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("insertHorizontalRule")}>Line</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-primary transition-colors cursor-pointer select-none">Format</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => execCommand("bold")}>Bold</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("italic")}>Italic</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("underline")}>Underline</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("removeFormat")}>Clear All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Action Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-background flex-wrap">
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/40">
          <Button onClick={() => execCommand("undo")} type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Undo className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("redo")} type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Redo className="h-4 w-4" /></Button>
        </div>
        
        <div className="flex items-center gap-1 px-2 border-r border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] font-bold px-2 flex justify-between gap-2 w-32 rounded-lg bg-accent/5">
                <span className="truncate">{currentFont}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => handleFontChange("Arial", "Arial")} style={{ fontFamily: "Arial" }}>Arial</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Courier New", "Courier New")} style={{ fontFamily: "Courier New" }}>Courier New</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Georgia", "Georgia")} style={{ fontFamily: "Georgia" }}>Georgia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Times New Roman", "Times New Roman")} style={{ fontFamily: "Times New Roman" }}>Times New Roman</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Verdana", "Verdana")} style={{ fontFamily: "Verdana" }}>Verdana</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] font-bold px-2 flex justify-between gap-1 w-20 rounded-lg bg-accent/5">
                {currentSize}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs">
              <DropdownMenuItem onClick={() => handleSizeChange("1", "8pt")}>8pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("2", "10pt")}>10pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("3", "12pt")}>12pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("4", "14pt")}>14pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("5", "18pt")}>18pt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <Button onClick={() => execCommand("bold")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.bold && "bg-primary/10 text-primary")}><Bold className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("italic")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.italic && "bg-primary/10 text-primary")}><Italic className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("underline")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.underline && "bg-primary/10 text-primary")}><Underline className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-0.5 px-2">
          <Button onClick={() => execCommand("justifyLeft")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.justifyLeft && "bg-primary/10 text-primary")}><AlignLeft className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("justifyCenter")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.justifyCenter && "bg-primary/10 text-primary")}><AlignCenter className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("justifyRight")} type="button" variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", activeFormats.justifyRight && "bg-primary/10 text-primary")}><AlignRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Editable Content */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={checkActiveFormats}
        onKeyUp={checkActiveFormats}
        onMouseUp={checkActiveFormats}
        className="min-h-[400px] p-8 text-sm outline-none w-full bg-background overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30" 
        data-placeholder={placeholder || "Start typing your announcement..."}
      />
    </div>
  );
};
