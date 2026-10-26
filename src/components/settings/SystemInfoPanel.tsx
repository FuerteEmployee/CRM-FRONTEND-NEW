import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { settingsService } from "@/api/services/settings.service";
import { formatDateTime } from "@/lib/dateFormat";

// Setup > Settings > System/Server Information — live values from
// GET /api/settings/system-info (server internals only for the super admin).

interface InfoRow {
  section: string;
  name: string;
  value: string;
  status?: string;
  type?: "datetime";
}

export const SystemInfoPanel = () => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["system-info"],
    queryFn: () => settingsService.getSystemInfo(),
  });
  const rows: InfoRow[] = Array.isArray(data) ? data : [];
  const sections = [...new Set(rows.map((r) => r.section || ""))];

  return (
    <CardContent className="p-0">
      <div className="flex justify-end px-4 pt-3">
        <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {isLoading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="p-6 text-sm text-destructive">Could not load system information.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Variable Name</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => [
              sections.length > 1 && (
                <TableRow key={`s-${section}`} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={2} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{section}</TableCell>
                </TableRow>
              ),
              ...rows
                .filter((r) => (r.section || "") === section)
                .map((r) => {
                  const value = r.type === "datetime" ? formatDateTime(r.value) : r.value;
                  return (
                    <TableRow key={`${section}-${r.name}`}>
                      <TableCell className="text-muted-foreground"><span className="font-medium">{r.name}</span></TableCell>
                      <TableCell>
                        {r.status ? (
                          <Badge variant={r.status as any} className="font-mono text-[10px] uppercase">{value}</Badge>
                        ) : (
                          <span className="font-mono text-sm break-all">{value}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }),
            ])}
          </TableBody>
        </Table>
      )}
    </CardContent>
  );
};
