import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableContainer } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, Copy, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { claudeConnectorService } from "@/api/services/claudeConnector.service";

interface Connection {
  id: string;
  staff: { id: string; name: string; email: string } | null;
  client_name: string;
  connected_at: string;
  last_used_at: string | null;
}

interface Status {
  enabled: boolean;
  mcp_url: string | null;
  connections: Connection[];
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "Not used yet");

// Setup > Settings > Integrations > Claude Connector. Lets a company admin
// switch the connector on, see which staff have connected Claude, and
// disconnect one or everyone. Only admins reach the backend routes.
export function ClaudeConnectorSettingsTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const { data, isLoading, error } = useQuery<Status>({
    queryKey: ["claude-connector"],
    queryFn: () => claudeConnectorService.getStatus(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["claude-connector"] });

  const toggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      await claudeConnectorService.setEnabled(enabled);
      toast.success(enabled ? "Claude connector switched on" : "Claude connector switched off");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't save the setting");
    } finally {
      setSaving(false);
    }
  };

  const revokeOne = async (id: string) => {
    try {
      await claudeConnectorService.revokeConnection(id);
      toast.success("Disconnected");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't disconnect");
    }
  };

  const revokeAll = async () => {
    try {
      const res = await claudeConnectorService.revokeAll();
      toast.success(`Disconnected ${res?.revoked ?? 0} connection(s)`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't disconnect");
    } finally {
      setConfirmRevokeAll(false);
    }
  };

  const copyUrl = async () => {
    if (!data?.mcp_url) return;
    try {
      await navigator.clipboard.writeText(data.mcp_url);
      toast.success("Connector URL copied");
    } catch {
      toast.error("Couldn't copy. Select the URL and copy it manually.");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Claude Connector</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Lets your staff use the CRM from Claude (claude.ai). Each person signs in with their own CRM account, and Claude can only see and change what
            their role allows. Invoices, payments and other money records are read-only through Claude.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">Couldn't load the connector status. Only company admins can manage it.</p>
          ) : !data?.mcp_url ? (
            <p className="text-sm text-muted-foreground">
              The Claude connector isn't set up on this server yet (MCP_PUBLIC_URL is not configured). Please contact support.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Allow Claude for this company</p>
                  <p className="text-sm text-muted-foreground">Switching this off disconnects every Claude connection immediately.</p>
                </div>
                <Switch checked={data.enabled} disabled={saving} onCheckedChange={toggle} aria-label="Allow Claude for this company" />
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Connector URL</p>
                <p className="text-sm text-muted-foreground">
                  In Claude, open Settings → Connectors → Add custom connector and paste this URL.
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 min-w-0 truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">{data.mcp_url}</code>
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {data?.mcp_url && (
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">Connected staff</CardTitle>
              <Button variant="destructive" size="sm" disabled={!data.connections.length} onClick={() => setConfirmRevokeAll(true)}>
                <Unplug className="h-4 w-4 mr-1" /> Disconnect everyone
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.connections.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nobody has connected Claude yet.</p>
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Connected</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.connections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.staff?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{c.staff?.email}</div>
                        </TableCell>
                        <TableCell>{c.client_name}</TableCell>
                        <TableCell>{formatDate(c.connected_at)}</TableCell>
                        <TableCell>{formatDate(c.last_used_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => revokeOne(c.id)}>
                            Disconnect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect everyone from Claude?</AlertDialogTitle>
            <AlertDialogDescription>
              Every staff member's Claude connection to this CRM stops working right away. They can sign in again from Claude while the connector is
              switched on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeAll}>Disconnect everyone</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
