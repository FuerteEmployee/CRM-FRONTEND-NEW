import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Paperclip, UploadCloud, Download, Trash2, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/dateFormat";
import { fileService } from "@/api/services/file.service";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { toast } from "sonner";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];
const ALLOWED_LABEL = "PDF, DOCX, XLSX, PNG, JPG, JPEG";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const formatSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function LeadAttachmentsTab({ lead }: { lead: any }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: files = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-files", lead._id],
    queryFn: () => fileService.getFiles(lead._id, "lead"),
  });

  const uploadMutation = useMutation({
    mutationFn: (validFiles: File[]) => fileService.uploadFiles(lead._id, "lead", validFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-files", lead._id] });
      queryClient.invalidateQueries({ queryKey: ["lead-activity-log", lead._id] });
      toast.success("File(s) uploaded successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to upload file(s)"),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => fileService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-files", lead._id] });
      toast.success("File deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete file"),
  });

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" isn't an allowed type. Allowed: ${ALLOWED_LABEL}`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`"${file.name}" is over the 10MB limit`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length > 0) uploadMutation.mutate(valid);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <UploadCloud className="h-8 w-8 mx-auto text-slate-400" />
        <p className="text-sm font-bold text-slate-600 mt-2">
          {uploadMutation.isPending ? "Uploading..." : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
          {ALLOWED_LABEL} · up to 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Paperclip className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No attachments yet for this lead</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">File</th>
                <th className="text-left px-4 py-3">Uploaded By</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map((f: any) => {
                const uploaderName = f.addedfrom
                  ? [f.addedfrom.firstname, f.addedfrom.lastname].filter(Boolean).join(" ")
                  : "—";
                return (
                  <tr key={f._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{f.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{uploaderName}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(f.dateadded)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatSize(f.size)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={resolveImageUrl(`uploads/${f.attachment_key}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={f.file_name}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${f.file_name}"?`)) deleteMutation.mutate(f._id);
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
