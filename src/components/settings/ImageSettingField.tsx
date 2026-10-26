import { useRef, useState } from "react";
import { ImageOff, Pencil, Trash2, Undo2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface ImageSettingFieldProps {
  label: string;
  description?: string;
  /** Stored file name, an uploaded data URL, or "" when there is no image. */
  value: string;
  onChange: (value: string) => void;
  /** Shown under the field while it is empty, e.g. what the CRM uses instead. */
  emptyHint?: string;
  accept?: string;
  dark?: boolean;
  previewClassName?: string;
  maxSizeMB?: number;
}

/**
 * Image setting with preview, Upload/Change, Delete and Undo. The value is
 * only kept in page state; Setup > Settings saves it with "Save Changes".
 */
export const ImageSettingField = ({
  label,
  description,
  value,
  onChange,
  emptyHint,
  accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml",
  dark,
  previewClassName = "max-h-12",
  maxSizeMB = 2,
}: ImageSettingFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const pickFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be ${maxSizeMB} MB or smaller.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      // The API stores data URLs whose type is letters/+/- only; Windows .ico
      // files report "image/vnd.microsoft.icon", so send the common alias.
      const dataUrl = String(reader.result).replace(/^data:image\/vnd\.microsoft\.icon/, "data:image/x-icon");
      setBroken(false);
      setRemoved(null);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const remove = () => {
    setRemoved(value);
    setBroken(false);
    onChange("");
  };

  const undo = () => {
    if (removed === null) return;
    onChange(removed);
    setRemoved(null);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>
      {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}
      <div className="flex items-center gap-4 flex-wrap">
        <div
          className={cn(
            "h-16 min-w-[140px] max-w-[280px] px-3 rounded-lg border flex items-center justify-center overflow-hidden",
            dark ? "bg-slate-800 border-slate-700" : "bg-muted/30 border-border"
          )}
        >
          {value && !broken ? (
            <img src={resolveImageUrl(value)} alt={label} className={cn("w-auto object-contain", previewClassName)} onError={() => setBroken(true)} />
          ) : (
            <span className={cn("text-xs flex items-center gap-1.5", dark ? "text-slate-400" : "text-muted-foreground")}>
              <ImageOff className="h-4 w-4" />
              {value ? "Image not found" : "No image"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => inputRef.current?.click()}>
            {value ? <Pencil className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {value ? "Change" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          {!value && removed !== null && (
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={undo}>
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {!value && emptyHint && <p className="text-xs text-muted-foreground">{emptyHint}</p>}
    </div>
  );
};
