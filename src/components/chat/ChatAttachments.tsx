import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { chatService } from "@/api/services/chat.service";

export interface ChatAttachment {
  _id: string;
  name: string;
  mimetype?: string;
  size?: number;
}

export const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;
const OPENABLE_EXT = /\.(png|jpe?g|gif|webp|pdf)$/i;
export const isImageFile = (name: string) => IMAGE_EXT.test(name || "");

// Chat files are private, so they are fetched with the login token and shown
// through blob: URLs. Keep the last ones so scrolling back does not refetch.
const MAX_CACHED = 150;
const blobUrls = new Map<string, string>();
const cacheKey = (messageId: string, attachmentId: string) => `${messageId}:${attachmentId}`;

const getBlobUrl = async (messageId: string, attachmentId: string) => {
  const key = cacheKey(messageId, attachmentId);
  const hit = blobUrls.get(key);
  if (hit) return hit;
  const blob = await chatService.getFileBlob(messageId, attachmentId);
  const url = URL.createObjectURL(blob);
  blobUrls.set(key, url);
  if (blobUrls.size > MAX_CACHED) {
    const [oldestKey, oldestUrl] = blobUrls.entries().next().value as [string, string];
    URL.revokeObjectURL(oldestUrl);
    blobUrls.delete(oldestKey);
  }
  return url;
};

/** Save a chat file to the computer. */
export const downloadChatFile = async (messageId: string, attachment: ChatAttachment) => {
  const blob = await chatService.getFileBlob(messageId, attachment._id, true);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = attachment.name || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Open an image / PDF in a new tab; any other type is downloaded instead. */
export const openChatFile = async (messageId: string, attachment: ChatAttachment) => {
  if (!OPENABLE_EXT.test(attachment.name || "")) return downloadChatFile(messageId, attachment);
  // Open the tab first (inside the click) so pop-up blockers allow it.
  const tab = window.open("", "_blank");
  try {
    const url = await getBlobUrl(messageId, attachment._id);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (e) {
    tab?.close();
    throw e;
  }
};

const ImagePreview = ({ messageId, attachment, onError }: { messageId: string; attachment: ChatAttachment; onError: (e: unknown) => void }) => {
  const [url, setUrl] = useState<string | null>(blobUrls.get(cacheKey(messageId, attachment._id)) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) return;
    let alive = true;
    getBlobUrl(messageId, attachment._id)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [messageId, attachment._id, url]);

  if (failed) return <FileCard messageId={messageId} attachment={attachment} onError={onError} />;
  if (!url) {
    return (
      <div className="h-40 w-56 max-w-full rounded-lg bg-black/10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin opacity-60" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openChatFile(messageId, attachment).catch(onError)}
      className="block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring"
      title={`Open ${attachment.name}`}
    >
      <img src={url} alt={attachment.name} className="max-h-60 w-auto max-w-full object-cover" loading="lazy" />
    </button>
  );
};

const FileCard = ({ messageId, attachment, onError }: { messageId: string; attachment: ChatAttachment; onError: (e: unknown) => void }) => {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1.5 min-w-[200px] max-w-full">
      <FileText className="h-8 w-8 shrink-0 opacity-80" />
      <button
        type="button"
        onClick={run(() => openChatFile(messageId, attachment))}
        className="flex-1 min-w-0 text-left hover:underline"
        title={`Open ${attachment.name}`}
      >
        <span className="block text-xs font-medium truncate">{attachment.name}</span>
        <span className="block text-[10px] opacity-70">{formatFileSize(attachment.size)}</span>
      </button>
      <button
        type="button"
        onClick={run(() => downloadChatFile(messageId, attachment))}
        className="p-1.5 rounded-full hover:bg-black/10 shrink-0"
        title="Download"
        aria-label={`Download ${attachment.name}`}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    </div>
  );
};

/** Files inside one chat message: images as previews, other files as cards. */
export const ChatAttachments = ({
  messageId,
  attachments,
  onError,
}: {
  messageId: string;
  attachments: ChatAttachment[];
  onError: (e: unknown) => void;
}) => (
  <div className="flex flex-col gap-1.5 mb-1">
    {attachments.map((a) =>
      isImageFile(a.name) ? (
        <ImagePreview key={a._id} messageId={messageId} attachment={a} onError={onError} />
      ) : (
        <FileCard key={a._id} messageId={messageId} attachment={a} onError={onError} />
      )
    )}
  </div>
);
