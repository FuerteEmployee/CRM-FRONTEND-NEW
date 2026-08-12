import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Copy, Trash2, Code2 } from "lucide-react";

import { websiteLeadFormService } from "@/api/services/websiteLeadForm.service";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// VITE_API_URL is a relative path ("/api") in local dev, since the app proxies
// it to the backend on the same origin — but this URL gets embedded on a
// completely different domain (the client's landing page), so it must always
// be absolute, not relative to whatever origin the CRM happens to be loaded from.
const rawApiUrl = import.meta.env.VITE_API_URL || "/api";
const resolvedApiUrl = rawApiUrl.startsWith("http") ? rawApiUrl : `${window.location.origin}${rawApiUrl}`;
const PUBLIC_API_BASE = `${resolvedApiUrl}/public/website-leads`;

const buildSnippet = (publicUrl: string) => `<script>
document.querySelector('#your-form-id').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;
  await fetch('${publicUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.querySelector('[name="full_name"]').value,
      phone: form.querySelector('[name="phone"]').value,
      email: form.querySelector('[name="email"]').value,
      city: form.querySelector('[name="city"]').value,
      // any other field names are kept too, shown as notes on the Lead
      type_of_space: form.querySelector('[name="type_of_space"]').value,
      budget: form.querySelector('[name="budget"]').value,
      timeline: form.querySelector('[name="timeline"]').value,
    }),
  });
  // show your own thank-you state here
});
</script>`;

export const WebsiteFormsDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forms, isLoading } = useQuery({
    queryKey: ["website-lead-forms"],
    queryFn: () => websiteLeadFormService.list(),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => websiteLeadFormService.create(name.trim()),
    onSuccess: () => {
      toast({ title: "Form Created", description: "Copy the snippet below into your landing page." });
      queryClient.invalidateQueries({ queryKey: ["website-lead-forms"] });
      setName("");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to Create", description: error?.message || "Please try again." });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => websiteLeadFormService.remove(id),
    onSuccess: () => {
      toast({ title: "Form Deleted", description: "That landing page will no longer create leads." });
      queryClient.invalidateQueries({ queryKey: ["website-lead-forms"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to Delete", description: error?.message || "Please try again." });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl font-black gap-2 border-slate-200 h-11 px-5 uppercase text-xs tracking-widest"
        >
          <Globe className="h-4 w-4 text-primary" />
          Website Forms
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Globe className="h-5 w-5 text-primary" />
            Website Lead Forms
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading forms...</p>
        ) : (
          <div className="space-y-5 py-2">
            {forms?.map((form: any) => {
              const publicUrl = `${PUBLIC_API_BASE}/${form.key}`;
              return (
                <div key={form._id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{form.name}</p>
                      <p className="text-xs text-slate-400">
                        {form.total_leads || 0} lead{form.total_leads === 1 ? "" : "s"} received
                        {form.last_lead_at && ` · last on ${new Date(form.last_lead_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Delete this form"
                      onClick={() => removeMutation.mutate(form._id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Public Endpoint</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={publicUrl} className="text-xs font-mono" />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        title="Copy endpoint URL"
                        onClick={() => copyToClipboard(publicUrl, "Endpoint URL")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs font-bold text-primary"
                    onClick={() => copyToClipboard(buildSnippet(publicUrl), "Embed snippet")}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Copy Embed Snippet
                  </Button>
                </div>
              );
            })}

            {(!forms || forms.length === 0) && (
              <p className="text-sm text-slate-400 border border-dashed rounded-xl p-4 text-center">
                No website forms yet — create one below to get a link you can wire into a landing page's form.
              </p>
            )}

            <div className="space-y-3 border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-500">
                Create an entry per landing page (e.g. "PSDJ Turnkey Landing Page"). You'll get a public URL —
                paste the fetch() snippet into that page's form submit handler and every submission becomes a
                Lead here, tagged with this form's name as the source.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="website-form-name" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Form Name
                </Label>
                <Input
                  id="website-form-name"
                  placeholder='e.g. "PSDJ Turnkey Landing Page"'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button
                className="w-full rounded-xl font-black"
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create Form"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
