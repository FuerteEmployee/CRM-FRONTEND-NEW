import { useQuery } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle, Share2, FileText, ExternalLink } from "lucide-react";
import { PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePermissionContext } from "@/context/PermissionContext";
import { estimateService } from "@/api/services/estimate.service";
import { useToast } from "@/hooks/use-toast";

type QuoteForm = { _id: string; name: string };

// Navbar "Share" panel: send the page you're on to a teammate (they still need
// to log in — a /admin link opened by staff lands on the same /staff page, see
// AdminProtectedRoute), plus the public links the company hands to customers.
export function ShareMenuContent({ open }: { open: boolean }) {
  const { toast } = useToast();
  const { canView, isModuleEnabled } = usePermissionContext();

  // Same gating as the sidebar's Setup > Estimate Request > Forms entry.
  const canSeeQuoteForms = canView("Estimate Request") && isModuleEnabled("estimate_request");
  const { data: quoteForms = [], isLoading } = useQuery<QuoteForm[]>({
    queryKey: ["estimate-request-forms"],
    queryFn: () => estimateService.getEstimateRequestForms().then((res: { data?: QuoteForm[] }) => res.data || (res as unknown as QuoteForm[])),
    enabled: open && canSeeQuoteForms,
  });

  const pageUrl = window.location.href;
  const pageTitle = document.title;

  // navigator.clipboard is missing on plain-http servers, so fall back to a prompt.
  const copyLink = async (link: string, label: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied", description: label });
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const shareOnWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`${pageTitle}\n${pageUrl}`)}`, "_blank", "noopener");

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(pageUrl)}`;
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const nativeShare = () => navigator.share({ title: pageTitle, url: pageUrl }).catch(() => {});

  const quoteFormUrl = (id: string) => `${window.location.origin}/forms/quote/${id}`;

  return (
    <PopoverContent align="end" className="w-80 p-0">
      <div className="border-b p-3">
        <h4 className="font-semibold text-sm">Share this page</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Teammates will need to log in to open it.</p>
      </div>
      <div className="p-2 space-y-0.5">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5" onClick={() => copyLink(pageUrl, "Page link copied to clipboard.")}>
          <Copy className="h-4 w-4" />
          Copy link
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5" onClick={shareOnWhatsApp}>
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          Send on WhatsApp
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5" onClick={shareByEmail}>
          <Mail className="h-4 w-4 text-blue-500" />
          Send by email
        </Button>
        {canNativeShare && (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5" onClick={nativeShare}>
            <Share2 className="h-4 w-4" />
            More options…
          </Button>
        )}
      </div>

      {canSeeQuoteForms && (
        <>
          <div className="border-t px-3 pt-3 pb-1">
            <h4 className="font-semibold text-sm">Public quote forms</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Customers can open these without logging in.</p>
          </div>
          <div className="p-2 max-h-56 overflow-y-auto">
            {isLoading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Loading forms…</p>
            ) : quoteForms.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No quote forms yet — create one in Setup › Estimate Request › Forms.
              </p>
            ) : (
              quoteForms.map((form) => (
                <div key={form._id} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted/50">
                  <FileText className="h-4 w-4 shrink-0 text-violet-500" />
                  <span className="flex-1 truncate text-sm" title={form.name}>{form.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Open form"
                    onClick={() => window.open(quoteFormUrl(form._id), "_blank", "noopener")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Copy form link"
                    onClick={() => copyLink(quoteFormUrl(form._id), `"${form.name}" link copied to clipboard.`)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </PopoverContent>
  );
}
