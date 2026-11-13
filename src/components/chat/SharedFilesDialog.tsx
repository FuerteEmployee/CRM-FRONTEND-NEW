import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { chatService } from "@/api/services/chat.service";
import { downloadChatFile, formatFileSize, isImageFile, openChatFile, type ChatAttachment } from "./ChatAttachments";

interface SharedFile extends ChatAttachment {
  messageId: string;
  createdAt: string;
  sender?: { firstname?: string; lastname?: string };
}

/** "Shared files" from the chat's ⋮ menu: every file sent in this conversation. */
export const SharedFilesDialog = ({
  open,
  onOpenChange,
  contactId,
  isGroup,
  title,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  isGroup: boolean;
  title: string;
  onError: (e: unknown) => void;
}) => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    chatService
      .getSharedFiles(contactId, isGroup)
      .then((data: SharedFile[]) => alive && setFiles(data))
      .catch((e: unknown) => alive && onError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // onError is a stable toast wrapper; reload only when the dialog opens or the chat changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactId, isGroup]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shared files</DialogTitle>
          <DialogDescription>Files sent in your chat with {title}.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[360px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No files shared yet.</div>
          ) : (
            <ul className="divide-y">
              {files.map((f) => (
                <li key={`${f.messageId}-${f._id}`} className="flex items-center gap-3 p-2.5">
                  {isImageFile(f.name) ? (
                    <ImageIcon className="h-8 w-8 shrink-0 text-primary" />
                  ) : (
                    <FileText className="h-8 w-8 shrink-0 text-primary" />
                  )}
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left hover:underline"
                    onClick={() => openChatFile(f.messageId, f).catch(onError)}
                    title={`Open ${f.name}`}
                  >
                    <span className="block text-sm font-medium truncate">{f.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {formatFileSize(f.size)} · {f.sender ? `${f.sender.firstname || ""} ${f.sender.lastname || ""}`.trim() : ""} ·{" "}
                      {format(new Date(f.createdAt), "dd MMM yyyy, hh:mm a")}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Download"
                    aria-label={`Download ${f.name}`}
                    onClick={() => downloadChatFile(f.messageId, f).catch(onError)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
