import { useQuery } from "@tanstack/react-query";
import { Info, Monitor, Server } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { settingsService } from "@/api/services/settings.service";
import { formatDateTime } from "@/lib/dateFormat";

// Setup > Settings > System Update — shows which code is actually running.
// The CRM is updated by deploying new code (Git + build), so there is no
// in-app update/download; this page only reports the current versions.

const appBuild: { commit: string; commitDate: string; builtAt: string } =
  typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : { commit: "", commitDate: "", builtAt: "" };

const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex justify-between gap-4 py-2 border-b last:border-0 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium font-mono text-right break-all">{value || "—"}</span>
  </div>
);

const when = (iso?: string) => (iso ? formatDateTime(iso) : "");

export const SystemVersionPanel = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-version"],
    queryFn: () => settingsService.getVersionInfo(),
    staleTime: 60 * 1000,
  });
  const backend = (data as any)?.backend || {};

  return (
    <CardContent className="p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Web App (this screen)</span>
          </div>
          <Row label="Version" value={appBuild.commit ? `build ${appBuild.commit}` : "unknown"} />
          <Row label="Code date" value={when(appBuild.commitDate)} />
          <Row label="Built on" value={when(appBuild.builtAt)} />
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Server</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not read the server version.</p>
          ) : (
            <>
              <Row label="Version" value={backend.commit ? `build ${backend.commit}` : "unknown"} />
              <Row label="Code date" value={when(backend.commitDate)} />
              <Row label="Running since" value={when(backend.startedAt)} />
              <Row label="Node.js" value={backend.node} />
            </>
          )}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 leading-relaxed">
          Updates to this CRM are installed by your developer when a new version is deployed — there is nothing to download here.
          The version shows which build is currently running; it changes automatically after each update.
        </p>
      </div>
    </CardContent>
  );
};
