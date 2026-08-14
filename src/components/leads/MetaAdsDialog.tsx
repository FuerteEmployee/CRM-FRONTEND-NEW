import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Facebook, RefreshCw, Unlink, CheckCircle2, ExternalLink, Download } from "lucide-react";

import { metaIntegrationService } from "@/api/services/metaIntegration.service";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const MetaAdsDialog = () => {
  const [open, setOpen] = useState(false);
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["meta-integration"],
    queryFn: () => metaIntegrationService.get(),
    enabled: open,
  });

  const connections: any[] = data?.connections || [];

  const connectMutation = useMutation({
    mutationFn: () => metaIntegrationService.connect({ page_id: pageId.trim(), page_access_token: accessToken.trim() }),
    onSuccess: () => {
      toast({ title: "Meta Page Connected", description: "Lead Ads forms loaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["meta-integration"] });
      setPageId("");
      setAccessToken("");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Connection Failed", description: error?.message || "Could not connect to Meta." });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (pageId: string) => metaIntegrationService.sync(pageId),
    onSuccess: () => {
      toast({ title: "Forms Synced", description: "Lead Ads forms refreshed from Meta." });
      queryClient.invalidateQueries({ queryKey: ["meta-integration"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Sync Failed", description: error?.message || "Could not sync forms." });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ pageId, formId }: { pageId: string; formId?: string }) =>
      metaIntegrationService.importLeads(pageId, formId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      // Importing from a form whose questions have never been imported before
      // creates brand-new CustomField columns server-side — without this, the
      // Leads table's cached column list wouldn't know about them until
      // something else happened to refetch it.
      queryClient.invalidateQueries({ queryKey: ["custom-fields", "leads"] });
      const parts = [`${data.imported} new lead${data.imported === 1 ? "" : "s"} imported`];
      if (data.skipped_duplicates) parts.push(`${data.skipped_duplicates} already in CRM (skipped)`);
      if (data.truncated) parts.push("form has more leads than one import can pull — run Import again to continue");
      toast({ title: "Import Complete", description: parts.join(", ") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Import Failed", description: error?.message || "Could not import leads." });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (pageId: string) => metaIntegrationService.disconnect(pageId),
    onSuccess: () => {
      toast({ title: "Disconnected", description: "This Meta Page has been disconnected." });
      queryClient.invalidateQueries({ queryKey: ["meta-integration"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to disconnect", description: error?.message || "Please try again." });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl font-black gap-2 border-slate-200 h-11 px-5 uppercase text-xs tracking-widest"
        >
          <Facebook className="h-4 w-4 text-[#1877F2]" />
          Meta Ads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            Meta Lead Ads Integration
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading connection status...</p>
        ) : (
          <div className="space-y-5 py-2">
            {connections.map((integration: any) => {
              const isSyncingThis = syncMutation.isPending && syncMutation.variables === integration.page_id;
              const isImportingThis =
                importMutation.isPending && importMutation.variables?.pageId === integration.page_id;
              const isImportingForm = (formId: string) =>
                isImportingThis && importMutation.variables?.formId === formId;
              const isDisconnectingThis =
                disconnectMutation.isPending && disconnectMutation.variables === integration.page_id;

              return (
                <div key={integration.page_id} className="rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Connected to {integration.page_name || "Facebook Page"}
                    </div>
                    <p className="text-xs text-emerald-700/80 mt-1">Page ID: {integration.page_id}</p>
                    <p className="text-xs text-emerald-700/80">
                      Token: {integration.page_access_token_masked}
                    </p>
                    {integration.last_synced && (
                      <p className="text-xs text-emerald-700/60 mt-1">
                        Last synced: {new Date(integration.last_synced).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Lead Ads Forms ({integration.forms?.length || 0})
                      </Label>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-xs font-bold"
                          onClick={() => syncMutation.mutate(integration.page_id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncingThis ? "animate-spin" : ""}`} />
                          Sync Forms
                        </Button>
                        {integration.forms?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs font-bold text-primary"
                            onClick={() => importMutation.mutate({ pageId: integration.page_id })}
                            disabled={importMutation.isPending}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {isImportingThis && !importMutation.variables?.formId ? "Importing..." : "Import All"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {!integration.forms || integration.forms.length === 0 ? (
                      <p className="text-sm text-slate-400 border border-dashed rounded-xl p-4 text-center">
                        No Lead Ads forms found for this Page yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {integration.forms.map((form: any) => (
                          <div
                            key={form.form_id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800">{form.name || "Untitled Form"}</p>
                              <p className="text-xs text-slate-400">ID: {form.form_id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  form.status === "ACTIVE"
                                    ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                                    : "border-slate-200 text-slate-500"
                                }
                              >
                                {form.status || "UNKNOWN"}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title={`Import leads from ${form.name || "this form"}`}
                                onClick={() => importMutation.mutate({ pageId: integration.page_id, formId: form.form_id })}
                                disabled={importMutation.isPending}
                              >
                                <Download className={`h-3.5 w-3.5 ${isImportingForm(form.form_id) ? "animate-pulse" : ""}`} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-3">
                      New leads submitted on these forms appear automatically in the Leads table, tagged with source "Meta Ads".
                      Use <span className="font-bold">Import</span> to pull in leads that were already submitted before this Page was connected.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => disconnectMutation.mutate(integration.page_id)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Unlink className="h-4 w-4" />
                    {isDisconnectingThis ? "Disconnecting..." : "Disconnect Page"}
                  </Button>
                </div>
              );
            })}

            <div className="space-y-4 py-2 border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-500">
                {connections.length > 0
                  ? "Connect another Facebook Page — each Page keeps its own token and forms, and can be synced or disconnected independently."
                  : "Connect a Facebook Page to automatically pull its Lead Ads forms and route new leads straight into this Leads table."}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="meta-page-id" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Facebook Page ID
                </Label>
                <Input
                  id="meta-page-id"
                  placeholder="e.g. 102938475610293"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-page-token" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Page Access Token
                </Label>
                <Input
                  id="meta-page-token"
                  type="password"
                  placeholder="Paste the Page Access Token from Meta"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <a
                  href="https://developers.facebook.com/docs/pages/access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  Where do I find this? <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button
                className="w-full rounded-xl font-black"
                disabled={!pageId.trim() || !accessToken.trim() || connectMutation.isPending}
                onClick={() => connectMutation.mutate()}
              >
                {connectMutation.isPending ? "Connecting..." : "Connect Page"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
