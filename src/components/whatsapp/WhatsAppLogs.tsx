import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableContainer, TableEmpty, TablePagination } from "@/components/ui/table";

const STATUS_STYLES: Record<string, string> = {
  Sent: "bg-slate-50 text-slate-600 border-slate-200",
  Delivered: "bg-blue-50 text-blue-600 border-blue-200",
  Read: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Failed: "bg-red-50 text-red-600 border-red-200",
  OptedOut: "bg-amber-50 text-amber-600 border-amber-200",
};

export function WhatsAppLogs() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-logs", page, status, search],
    queryFn: () =>
      whatsappCampaignService.getLogs({
        page,
        limit: 50,
        ...(status !== "all" ? { status } : {}),
        ...(search ? { search } : {}),
      }),
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search mobile number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Read">Read</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="OptedOut">Opted Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mobile</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Sent At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
          ) : logs.length === 0 ? (
            <TableEmpty colSpan={5}>No messages yet</TableEmpty>
          ) : (
            logs.map((log: any) => (
              <TableRow key={log._id}>
                <TableCell>{log.mobile}</TableCell>
                <TableCell className="text-muted-foreground">{log.template_id}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_STYLES[log.status]}>{log.status}</Badge></TableCell>
                <TableCell className="text-red-600">{log.error || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(log.sent_at || log.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination page={page} pageSize={50} total={data?.total || 0} onPageChange={setPage} />
      </TableContainer>
    </div>
  );
}
