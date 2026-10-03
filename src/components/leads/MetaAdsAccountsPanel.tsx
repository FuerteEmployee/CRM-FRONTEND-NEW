import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Link2, Trash2, KeyRound, Pause, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { metaAdsService } from "@/api/services/metaAds.service";
import { formatDateTime } from "@/lib/dateFormat";

interface MetaAdsAccountsPanelProps {
  isAdmin: boolean;
  canSync: boolean;
}

// Each company connects its own Meta ad account(s) with its own token; the
// token is encrypted server-side and never sent back to the browser.
export function MetaAdsAccountsPanel({ isAdmin, canSync }: MetaAdsAccountsPanelProps) {
  const queryClient = useQueryClient();
  const [adAccountId, setAdAccountId] = useState("");
  const [token, setToken] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [newToken, setNewToken] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["meta-ads-accounts"],
    queryFn: metaAdsService.listAccounts,
  });
  const accounts: any[] = data?.accounts || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["meta-ads-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };
  const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

  const connectMutation = useMutation({
    mutationFn: () => metaAdsService.connect({ ad_account_id: adAccountId.trim(), access_token: token.trim() }),
    onSuccess: () => {
      toast.success("Ad account connected — importing the last 30 days of spend");
      setAdAccountId("");
      setToken("");
      setShowForm(false);
      refresh();
      setTimeout(refresh, 8000);
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to connect ad account")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => metaAdsService.update(id, payload),
    onSuccess: () => {
      toast.success("Ad account updated");
      setReplacing(null);
      setNewToken("");
      refresh();
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to update ad account")),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => metaAdsService.disconnect(id),
    onSuccess: () => {
      toast.success("Ad account disconnected");
      refresh();
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to disconnect")),
  });

  const syncMutation = useMutation({
    mutationFn: () => metaAdsService.syncNow(7),
    onSuccess: (res: any) => {
      const failed = (res?.accounts || []).filter((a: any) => !a.ok).length;
      if (failed) toast.error(`${failed} ad account(s) failed to sync — see the error below`);
      else toast.success(`Synced ${res?.upserted ?? 0} day/campaign entries from Meta`);
      refresh();
    },
    onError: (err: any) => toast.error(errMsg(err, "Sync failed")),
  });

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-600">Meta Ads accounts</p>
          <p className="text-[11px] text-slate-500">Spend is pulled automatically every few hours. Synced entries are read-only.</p>
        </div>
        <div className="flex gap-2">
          {canSync && accounts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
              className="h-8 rounded-xl gap-1.5 text-[11px] font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Sync now"}
            </Button>
          )}
          {isAdmin && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="h-8 rounded-xl gap-1.5 text-[11px] font-bold">
              <Link2 className="h-3.5 w-3.5" /> Connect ad account
            </Button>
          )}
        </div>
      </div>

      {data && data.encryptionConfigured === false && isAdmin && (
        <p className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Server is missing INTEGRATION_ENCRYPTION_KEY — ad accounts can't be connected until it's configured.
        </p>
      )}

      {isAdmin && showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ad Account ID</Label>
              <Input
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_1234567890"
                autoComplete="off"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access token (ads_read)</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="System User token"
                autoComplete="new-password"
                className="h-10 text-xs"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Meta Business Settings → System Users → Generate token with <b>ads_read</b> for this ad account. The token is
            checked with Meta, stored encrypted, and never shown again.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-8 rounded-xl font-bold">Cancel</Button>
            <Button
              size="sm"
              disabled={connectMutation.isPending || !adAccountId.trim() || token.trim().length < 20}
              onClick={() => connectMutation.mutate()}
              className="h-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              {connectMutation.isPending ? "Checking with Meta..." : "Connect"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? null : accounts.length === 0 ? (
        <p className="text-xs text-slate-500">
          {isAdmin ? "No ad account connected yet." : "No ad account connected yet — ask your admin to connect one."}
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a._id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">{a.name || `act_${a.ad_account_id}`}</p>
                  <p className="text-[11px] text-slate-500">
                    act_{a.ad_account_id}
                    {a.currency ? ` · ${a.currency}` : ""} · token {a.token_hint}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!a.is_active ? (
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-500">Paused</Badge>
                  ) : a.last_sync_status === "error" ? (
                    <Badge variant="outline" className="text-[10px] font-bold text-red-600 border-red-200 bg-red-50">Sync error</Badge>
                  ) : a.last_sync_status === "ok" ? (
                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Synced
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-500">Not synced yet</Badge>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        title="Replace token"
                        onClick={() => setReplacing(replacing === a._id ? null : a._id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={a.is_active ? "Pause syncing" : "Resume syncing"}
                        onClick={() => updateMutation.mutate({ id: a._id, payload: { is_active: !a.is_active } })}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      >
                        {a.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        title="Disconnect"
                        onClick={() =>
                          window.confirm(`Disconnect act_${a.ad_account_id}? Already-synced spend is kept.`) &&
                          disconnectMutation.mutate(a._id)
                        }
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {a.last_synced_at && (
                <p className="text-[10px] text-slate-400">Last sync: {formatDateTime(a.last_synced_at)}</p>
              )}
              {a.last_sync_status === "error" && a.last_sync_error && (
                <p className="text-[11px] font-semibold text-red-600 break-words">{a.last_sync_error}</p>
              )}
              {isAdmin && replacing === a._id && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Input
                    type="password"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder="New access token"
                    autoComplete="new-password"
                    className="h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending || newToken.trim().length < 20}
                    onClick={() => updateMutation.mutate({ id: a._id, payload: { access_token: newToken.trim() } })}
                    className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0"
                  >
                    Save token
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
