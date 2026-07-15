import { useState, useRef } from "react";
import {
  Import,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/hrms/components/ui/alert";
import { API_BASE_URL, getAuthToken } from "@/hrms/services/apiClient";
import { toast } from "sonner";
import { cn } from "@/hrms/lib/utils";

interface ImportExcelButtonProps {
  endpoint: string;
  onSuccess?: () => void;
  title: string;
  templateHeaders: string[];
  sampleText?: string;
  buttonLabel?: string;
}

interface ImportProgress {
  processed: number;
  total: number;
  success: number;
  failed: number;
}

export function ImportExcelButton({
  endpoint,
  onSuccess,
  title,
  templateHeaders,
  sampleText,
  buttonLabel = "Import Excel",
}: ImportExcelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toast.error("Please upload only Excel files (.xlsx, .xls)");
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(null);
    setResult(null);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Server error: ${response.status}`;
        try { errMsg = JSON.parse(errText)?.message || errMsg; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("Content-Type") ?? "";

      if (contentType.includes("text/event-stream")) {
        // ── SSE streaming (e.g. sales import) ──
        if (!response.body) throw new Error("No response body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (currentEvent === "start") {
                  setProgress({ processed: 0, total: data.total, success: 0, failed: 0 });
                } else if (currentEvent === "progress") {
                  setProgress({
                    processed: data.processed,
                    total: data.total,
                    success: data.success,
                    failed: data.failed,
                  });
                } else if (currentEvent === "done") {
                  setProgress(null);
                  setResult({ success: data.success, failed: data.failed, errors: data.errors ?? [] });
                  toast.success(`Import complete: ${data.success} succeeded, ${data.failed} failed`);
                  onSuccess?.();
                } else if (currentEvent === "error") {
                  toast.error(data.message || "Import failed");
                }
              } catch {
                // malformed JSON line — skip
              }
              currentEvent = "message";
            }
          }
        }
      } else {
        // ── Plain JSON response (items, customers, suppliers, etc.) ──
        const json = await response.json();
        const d = json?.data ?? {};
        const successCount = d.success ?? 0;
        const failedCount = d.failed ?? 0;
        const errors: string[] = d.errors ?? [];
        setResult({ success: successCount, failed: failedCount, errors });
        toast.success(`Import complete: ${successCount} succeeded, ${failedCount} failed`);
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setProgress(null);
    setLoading(false);
    setIsOpen(false);
  };

  const pct = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="rounded-md border-slate-200 bg-white hover:bg-slate-50 transition-all font-medium gap-2 text-slate-700 shadow-sm px-4 h-9 text-xs"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {buttonLabel}
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => !loading && (open ? setIsOpen(true) : resetState())}
      >
        <DialogContent className="sm:max-w-[550px] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-md">
          <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <FileSpreadsheet className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-800">{title}</DialogTitle>
                <DialogDescription className="text-[13px] text-slate-500 mt-0.5">
                  Upload Excel sheet to bulk import entries
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Column Guidelines */}
            <Alert className="bg-slate-50 border-[0.8px] border-slate-200 rounded-2xl p-4">
              <Info className="h-5 w-5 text-indigo-600" />
              <AlertTitle className="text-[13px] font-bold text-slate-800 ml-2">
                Excel Column Guidelines
              </AlertTitle>
              <AlertDescription className="text-xs text-slate-600 mt-1 ml-2">
                <p className="mb-2">
                  Your Excel sheet should contain columns matching these header names
                  (case-insensitive):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {templateHeaders.map((header) => (
                    <span
                      key={header}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border",
                        header.endsWith("*")
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      {header}
                    </span>
                  ))}
                </div>
                {sampleText && (
                  <p className="mt-2 text-[11px] text-muted-foreground font-semibold">
                    {sampleText}
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {/* Live Progress Bar */}
            {loading && progress && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>
                    Importing&nbsp;
                    <span className="text-indigo-600">
                      {progress.processed.toLocaleString("en-IN")}
                    </span>
                    &nbsp;/&nbsp;
                    <span className="text-slate-800">
                      {progress.total.toLocaleString("en-IN")}
                    </span>
                    &nbsp;invoices
                  </span>
                  <span className="text-slate-400">{pct}%</span>
                </div>

                {/* Linear Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex gap-4 text-[11px] font-bold pt-0.5">
                  <span className="text-emerald-600">
                    ✓ {progress.success.toLocaleString("en-IN")} succeeded
                  </span>
                  <span className="text-rose-500">
                    ✗ {progress.failed.toLocaleString("en-IN")} failed
                  </span>
                </div>
              </div>
            )}

            {/* Loading spinner (before first progress event arrives) */}
            {loading && !progress && (
              <div className="flex items-center gap-3 text-sm text-slate-600 font-medium py-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Parsing Excel file…
              </div>
            )}

            {/* Drag & Drop Zone */}
            {!result && !loading && (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[180px]",
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner"
                    : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10",
                  file ? "border-emerald-500 bg-emerald-50/10" : ""
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm max-w-[320px] truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="rounded-xl h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold px-3 transition-colors mt-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <Import className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm">
                        Drag &amp; drop your Excel file here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        or click to browse from computer (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Panel */}
            {result && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-emerald-700">
                        {result.success.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Succeeded
                      </p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <XCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-rose-700">
                        {result.failed.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Failed
                      </p>
                    </div>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                    <p className="text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                      Error Details
                    </p>
                    <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-2">
                      {result.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-rose-600 font-bold flex items-start gap-1"
                        >
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded mt-0.5">
                            #{idx + 1}
                          </span>
                          <span className="leading-relaxed">{err}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-row justify-between items-center gap-4">
            {result ? (
              <Button
                type="button"
                onClick={resetState}
                className="w-full rounded-xl bg-indigo-600 text-white font-bold h-12 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={resetState}
                  className="rounded-xl h-12 text-slate-500 hover:bg-slate-100 font-bold flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!file || loading}
                  onClick={handleImport}
                  className="rounded-xl bg-indigo-600 text-white font-bold h-12 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex-1 gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Importing…" : "Start Import"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
