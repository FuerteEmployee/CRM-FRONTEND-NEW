import React, { useState } from "react";
import { Server, Plug, RefreshCw, CheckCircle2, AlertTriangle, Activity, Lock, Hash, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient as api } from "@/api/client";
import { toast } from "sonner";
import { format } from "date-fns";

// A company that runs on its OWN CRM server (separate database, e.g. Rudraverse).
// This panel stores that server's URL, the company's id there and its
// CONTROL_SECRET (encrypted on the backend), and pushes plan / status / dates
// there through its /api/control. See BACKEND/src/services/remoteControl.js.

export interface RemoteInfo {
  url?: string;
  tenant_id?: string;
  remote_company_name?: string;
  connected_at?: string;
  last_sync_at?: string;
  last_sync_ok?: boolean;
  last_sync_error?: string;
}

export interface RemoteSync {
  ok: boolean;
  error?: string;
}

export const EMPTY_REMOTE_FORM = { url: "", remote_tenant_id: "", secret: "" };
export type RemoteForm = typeof EMPTY_REMOTE_FORM;

export const serverHost = (url?: string) => {
  try {
    return url ? new URL(url).host : "";
  } catch {
    return url || "";
  }
};

/** Shows a warning when a change was saved here but not delivered to the company's server. */
export const warnRemoteSync = (result: any, companyName: string) => {
  const sync: RemoteSync | null | undefined = result?.remote_sync;
  if (sync && !sync.ok) {
    toast.warning(`Saved here, but NOT sent to ${companyName}'s server`, {
      description: `${sync.error || "Server did not answer"}. Open Edit → Separate server → Sync now once it is reachable.`,
      duration: 12000,
    });
    return true;
  }
  return false;
};

const inputCls =
  "w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

/** URL + company id + secret inputs (used by Add Customer and by Edit). */
export function RemoteFields({
  value,
  onChange,
  secretOptional = false,
}: {
  value: RemoteForm;
  onChange: (v: RemoteForm) => void;
  secretOptional?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Server URL<span className="text-red-500 ml-0.5">*</span></label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="url"
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
            className={inputCls}
            placeholder="https://crm-api.trinetratechnoworld.com"
          />
        </div>
        <p className="text-[11px] text-gray-400">That CRM's backend address (not the login page).</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company ID on that server<span className="text-red-500 ml-0.5">*</span></label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={value.remote_tenant_id}
            onChange={(e) => onChange({ ...value, remote_tenant_id: e.target.value.trim() })}
            className={`${inputCls} font-mono`}
            placeholder="TENANT_ID from that server's .env (24 characters)"
            maxLength={24}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Control secret{!secretOptional && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="password"
            autoComplete="new-password"
            value={value.secret}
            onChange={(e) => onChange({ ...value, secret: e.target.value })}
            className={`${inputCls} font-mono`}
            placeholder={secretOptional ? "Leave blank to keep the saved secret" : "CONTROL_SECRET from that server's .env"}
          />
        </div>
        <p className="text-[11px] text-gray-400">Stored encrypted. It is never shown again.</p>
      </div>
    </div>
  );
}

/** "Separate server" section of the Edit Customer dialog. */
export function SeparateServerPanel({
  tenantId,
  companyName,
  remote,
  hasOwner,
  onChanged,
}: {
  tenantId: string;
  companyName: string;
  remote?: RemoteInfo | null;
  hasOwner: boolean;
  onChanged: (tenant: any) => void;
}) {
  const connected = !!remote?.url;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RemoteForm>(EMPTY_REMOTE_FORM);
  const [busy, setBusy] = useState<"" | "connect" | "test" | "sync" | "disconnect">("");

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (error: any) {
      toast.error(error.message || "Request failed");
    } finally {
      setBusy("");
    }
  };

  const startEdit = () => {
    setForm({ url: remote?.url || "", remote_tenant_id: remote?.tenant_id || "", secret: "" });
    setEditing(true);
  };

  const connect = () =>
    run("connect", async () => {
      const t = await api.put(`/super-admin/tenants/${tenantId}/remote`, form);
      const c = t.connect || {};
      toast.success(`Connected to "${c.remote_company_name}" on ${serverHost(t.remote?.url)}`, {
        description: c.remote_plan
          ? c.plan_linked
            ? `Plan "${c.remote_plan}", status and dates were read from that server.`
            : `That server uses plan "${c.remote_plan}", which doesn't exist here. Status and dates were read; pick a plan and Save to send one.`
          : "Status and dates were read from that server.",
        duration: 10000,
      });
      setEditing(false);
      onChanged(t);
    });

  const test = () =>
    run("test", async () => {
      const r = await api.post(`/super-admin/tenants/${tenantId}/remote/test`, {});
      const s = r.remote || {};
      const end = s.billing_cycle_end || s.trial_ends_at;
      toast.success(`Server OK — ${s.company_name}`, {
        description: `Status: ${s.status} · Plan: ${s.plan || "none"}${end ? ` · Ends: ${format(new Date(end), "MMM d, yyyy")}` : ""}`,
      });
    });

  const sync = () =>
    run("sync", async () => {
      const t = await api.post(`/super-admin/tenants/${tenantId}/remote/sync`, {});
      toast.success("Plan, status and dates sent to the server");
      onChanged(t);
    });

  const disconnect = () => {
    if (!window.confirm(`Stop managing "${companyName}" on ${serverHost(remote?.url)} from here?\n\nNothing changes on that server; its current plan stays as it is.`)) return;
    run("disconnect", async () => {
      const t = await api.delete(`/super-admin/tenants/${tenantId}/remote`);
      toast.success("Disconnected");
      onChanged(t);
    });
  };

  // A company with an owner login in THIS database lives here, not on its own server.
  if (!connected && hasOwner) return null;

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-indigo-600" />
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Separate server</span>
      </div>

      {connected && !editing && (
        <>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-2"><span className="text-gray-500">Server</span><span className="font-medium text-gray-900 truncate">{serverHost(remote!.url)}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500">Company there</span><span className="font-medium text-gray-900 truncate">{remote!.remote_company_name || "—"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500">Company ID</span><span className="font-mono text-xs text-gray-700">{remote!.tenant_id}</span></div>
          </div>
          {remote!.last_sync_ok === false ? (
            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-[12px] text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Last change NOT sent{remote!.last_sync_at ? ` (${format(new Date(remote!.last_sync_at), "MMM d, h:mm a")})` : ""}: {remote!.last_sync_error}
              </span>
            </div>
          ) : remote!.last_sync_at ? (
            <div className="flex items-center gap-2 text-[12px] text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> In sync · {format(new Date(remote!.last_sync_at), "MMM d, h:mm a")}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={test} className="h-8 text-xs">
              <Activity className="h-3.5 w-3.5 mr-1.5" />{busy === "test" ? "Testing…" : "Test connection"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={sync} className="h-8 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy === "sync" ? "animate-spin" : ""}`} />Sync now
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={startEdit} className="h-8 text-xs">Change</Button>
            <Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={disconnect} className="h-8 text-xs text-red-600 hover:text-red-700">Disconnect</Button>
          </div>
          <p className="text-[11px] text-gray-500">
            Plan, status, dates and add-ons you save here are sent to that server. Owner logins and staff are managed on that CRM itself.
          </p>
        </>
      )}

      {!connected && !editing && (
        <div className="space-y-2">
          <p className="text-[12px] text-gray-600">This company runs on its own CRM server with its own database? Connect it to manage its plan from here.</p>
          <Button type="button" size="sm" variant="outline" onClick={startEdit} className="h-8 text-xs">
            <Plug className="h-3.5 w-3.5 mr-1.5" />Connect to its server
          </Button>
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          <RemoteFields value={form} onChange={setForm} secretOptional={connected} />
          <p className="text-[11px] text-amber-700">
            Connecting reads the plan, status and dates FROM that server. Nothing is changed there.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="button" size="sm" disabled={!!busy || !form.url || !form.remote_tenant_id || (!connected && !form.secret)} onClick={connect} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plug className="h-3.5 w-3.5 mr-1.5" />{busy === "connect" ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
