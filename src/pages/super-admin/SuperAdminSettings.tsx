import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Save, Trash2, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiClient as api } from "@/api/client";
import { mediaService } from "@/api/services/media.service";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { PANEL_BRANDING_QUERY_KEY, usePanelBranding, usePanelBrandingQuery, type PanelBranding } from "@/lib/panelBranding";
import { useSaSkeleton } from "@/lib/superAdminQueries";
import { SuperAdminSettingsSkeleton } from "@/components/ui/page-skeleton";

const MAX_NAME = 60;
const IMAGE_RULES = {
  panelLogo: { label: "Panel logo", accept: "image/png,image/jpeg,image/svg+xml,image/webp", maxKb: 2048, hint: "Square image, PNG / JPG / SVG, up to 2 MB" },
  panelFavicon: { label: "Favicon", accept: ".ico,image/x-icon,image/png,image/svg+xml", maxKb: 512, hint: "Browser tab icon, ICO / PNG / SVG, up to 512 KB" },
} as const;
type ImageKey = keyof typeof IMAGE_RULES;

export default function SuperAdminSettings() {
  const queryClient = useQueryClient();
  const saved = usePanelBranding();
  const showSkeleton = useSaSkeleton(usePanelBrandingQuery().isPending);
  const [form, setForm] = useState<PanelBranding>(saved);
  const [nameError, setNameError] = useState("");
  const [uploading, setUploading] = useState<ImageKey | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputs = { panelLogo: useRef<HTMLInputElement>(null), panelFavicon: useRef<HTMLInputElement>(null) };

  // Fill the form once the saved branding arrives (it starts as the default).
  useEffect(() => setForm(saved), [saved.panelName, saved.panelLogo, saved.panelFavicon]);

  const handleFile = async (key: ImageKey, file?: File) => {
    if (!file) return;
    const rule = IMAGE_RULES[key];
    if (file.size > rule.maxKb * 1024) {
      toast.error(`${rule.label} is too large (max ${rule.maxKb >= 1024 ? rule.maxKb / 1024 + " MB" : rule.maxKb + " KB"})`);
      return;
    }
    setUploading(key);
    try {
      const res: any = await mediaService.uploadFile(file, "panel");
      const filename = res?.file?.filename;
      if (!filename) throw new Error("Upload failed");
      setForm((f) => ({ ...f, [key]: `/uploads/media/panel/${filename}` }));
    } catch (error: any) {
      toast.error(error.message || "Could not upload the image");
    } finally {
      setUploading(null);
      if (fileInputs[key].current) fileInputs[key].current!.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.panelName.trim();
    const err = !name ? "Panel name is required" : name.length > MAX_NAME ? `At most ${MAX_NAME} characters` : "";
    setNameError(err);
    if (err) return;
    setSaving(true);
    try {
      const updated = await api.put("/super-admin/panel-branding", { ...form, panelName: name });
      queryClient.setQueryData(PANEL_BRANDING_QUERY_KEY, updated);
      toast.success("Panel branding saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const changed = form.panelName !== saved.panelName || form.panelLogo !== saved.panelLogo || form.panelFavicon !== saved.panelFavicon;

  const imageField = (key: ImageKey) => {
    const rule = IMAGE_RULES[key];
    const value = form[key];
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{rule.label}</label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {value ? (
              <img src={resolveImageUrl(value)} alt={rule.label} className="h-full w-full object-contain p-1.5" />
            ) : (
              <ImagePlus className="h-6 w-6 text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputs[key].current?.click()}
                disabled={uploading !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {value ? "Change" : "Upload"}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, [key]: "" }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400">{rule.hint}</p>
          </div>
          <input ref={fileInputs[key]} type="file" accept={rule.accept} className="hidden" onChange={(e) => handleFile(key, e.target.files?.[0])} />
        </div>
      </div>
    );
  };

  if (showSkeleton) return <SuperAdminSettingsSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Branding of this Super Admin panel. Companies are not affected.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Panel Branding</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Panel name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <Input
              value={form.panelName}
              maxLength={MAX_NAME}
              onChange={(e) => setForm({ ...form, panelName: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8"
              placeholder="e.g. Fuerte CRM"
            />
          </div>
          {nameError ? (
            <p className="text-[11px] font-medium text-red-600">{nameError}</p>
          ) : (
            <p className="text-[11px] text-gray-400">Shown in the sidebar, the browser tab and the Super Admin login page.</p>
          )}
        </div>

        {imageField("panelLogo")}
        {imageField("panelFavicon")}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          {changed && (
            <button type="button" onClick={() => { setForm(saved); setNameError(""); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving || uploading !== null || !changed}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
