import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isRichTextEmpty, toRichHtml } from "@/lib/richText";

interface RichTextContentProps {
  value?: string | null;
  className?: string;
  /** Rendered instead of the content when the value is empty. */
  empty?: ReactNode;
}

/** Read-only, sanitized view of <RichTextEditor /> output. Plain-text values keep their line breaks. */
export const RichTextContent = ({ value, className, empty = null }: RichTextContentProps) => {
  const html = useMemo(() => toRichHtml(value), [value]);
  if (isRichTextEmpty(value)) return <>{empty}</>;
  return <div className={cn("rte-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
};
