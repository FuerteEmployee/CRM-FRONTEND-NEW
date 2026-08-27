import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/api/services/contract.service";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { formatDate } from "@/lib/dateFormat";
import { ChevronLeft, Download, PenLine, CheckCircle2, Undo2, Eraser } from "lucide-react";
import { jsPDF } from "jspdf";

const statusColors: Record<string, string> = {
  Active: "bg-green-50 text-green-700 border-green-200",
  Expired: "bg-red-50 text-red-700 border-red-200",
  Signed: "bg-primary/10 text-primary border-primary/20",
};

const getStatus = (c: any) => {
  if (!c) return "Active";
  if (c.is_signed) return "Signed";
  const now = new Date();
  if (c.dateend && new Date(c.dateend) < now) return "Expired";
  return "Active";
};

export default function ContractView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => contractService.getContractById(id!),
    enabled: !!id,
  });

  const [isSignOpen, setIsSignOpen] = useState(false);
  const [signerFirstName, setSignerFirstName] = useState("");
  const [signerLastName, setSignerLastName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokesRef.current.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    currentStrokeRef.current = [getPos(e)];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getPos(e);
    currentStrokeRef.current.push(pos);
    const ctx = canvasRef.current?.getContext("2d");
    const pts = currentStrokeRef.current;
    if (ctx && pts.length >= 2) {
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
      setHasDrawn(true);
    }
    currentStrokeRef.current = [];
  };

  const handleClearSignature = () => {
    strokesRef.current = [];
    setHasDrawn(false);
    redrawAll();
  };

  const handleUndoSignature = () => {
    strokesRef.current.pop();
    setHasDrawn(strokesRef.current.length > 0);
    redrawAll();
  };

  const openSignModal = () => {
    setSignerFirstName("");
    setSignerLastName("");
    setSignerEmail("");
    strokesRef.current = [];
    setHasDrawn(false);
    setIsSignOpen(true);
    setTimeout(redrawAll, 0);
  };

  const signMutation = useMutation({
    mutationFn: (data: any) => contractService.signContract(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
      toast({ title: "Signed", description: "Contract signed successfully." });
      setIsSignOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const handleSign = () => {
    if (!signerFirstName.trim() || !signerLastName.trim() || !signerEmail.trim()) {
      toast({ title: "Error", description: "First name, last name, and email are required.", variant: "destructive" });
      return;
    }
    if (!hasDrawn) {
      toast({ title: "Error", description: "Please draw your signature before signing.", variant: "destructive" });
      return;
    }
    const signature_data = canvasRef.current?.toDataURL("image/png");
    signMutation.mutate({
      firstname: signerFirstName.trim(),
      lastname: signerLastName.trim(),
      email: signerEmail.trim(),
      signature_data,
    });
  };

  const handleGeneratePDF = () => {
    if (!contract) return;
    const doc = new jsPDF();
    const margin = 14;
    let y = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRACT", margin, y);
    y += 10;

    doc.setFontSize(11);
    const clientName = contract.client?.company || `${contract.client?.firstname || ""} ${contract.client?.lastname || ""}`.trim() || "Unknown";

    const fields: [string, string][] = [
      ["Subject", contract.subject || "-"],
      ["Client", clientName],
      ["Contract Value", formatAmount(contract.contract_value || 0)],
      ["Contract Type", contract.contract_type || "-"],
      ["Start Date", contract.datestart ? formatDate(contract.datestart) : "-"],
      ["End Date", contract.dateend ? formatDate(contract.dateend) : "-"],
      ["Status", getStatus(contract)],
    ];

    fields.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), margin + 42, y);
      y += 7;
    });

    y += 4;
    if (contract.description) {
      doc.setFont("helvetica", "bold");
      doc.text("Description", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(contract.description, 180);
      doc.text(descLines, margin, y);
      y += descLines.length * 6 + 4;
    }

    if (contract.content) {
      const plainContent = contract.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (plainContent) {
        doc.setFont("helvetica", "bold");
        doc.text("Terms", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        const contentLines = doc.splitTextToSize(plainContent, 180);
        doc.text(contentLines, margin, y);
        y += contentLines.length * 6 + 4;
      }
    }

    if (contract.is_signed && contract.signature_data) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Signed by:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`${contract.signer_firstname} ${contract.signer_lastname} (${contract.signer_email})`, margin, y);
      y += 6;
      try {
        doc.addImage(contract.signature_data, "PNG", margin, y, 60, 25);
        y += 30;
      } catch {
        // malformed signature image — skip embedding it, rest of the PDF is still valid
      }
      doc.setFontSize(9);
      doc.text(`Signed on ${contract.signed_at ? formatDate(contract.signed_at) : ""}`, margin, y);
    }

    doc.save(`contract_${(contract.subject || "document").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.pdf`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-muted-foreground">Loading contract...</div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-muted-foreground">Contract not found.</div>
      </DashboardLayout>
    );
  }

  const clientName = contract.client?.company || `${contract.client?.firstname || ""} ${contract.client?.lastname || ""}`.trim() || "Unknown";
  const status = getStatus(contract);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2 font-bold" onClick={() => navigate("/admin/contracts")}>
            <ChevronLeft className="h-4 w-4" /> Back to Contracts
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 font-bold rounded-xl" onClick={handleGeneratePDF}>
              <Download className="h-4 w-4" /> Generate PDF
            </Button>
            {!contract.is_signed && (
              <Button className="gap-2 font-bold rounded-xl shadow-lg shadow-primary/20" onClick={openSignModal}>
                <PenLine className="h-4 w-4" /> Sign
              </Button>
            )}
          </div>
        </div>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <CardTitle className="text-2xl font-black">{contract.subject}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Client: {clientName}</p>
            </div>
            <Badge variant="outline" className={statusColors[status] || statusColors.Active}>
              {status === "Signed" && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              {status}
            </Badge>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contract Value</p>
                <p className="text-sm font-bold mt-1">{formatAmount(contract.contract_value || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contract Type</p>
                <p className="text-sm font-bold mt-1">{contract.contract_type || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start Date</p>
                <p className="text-sm font-bold mt-1">{contract.datestart ? formatDate(contract.datestart) : "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">End Date</p>
                <p className="text-sm font-bold mt-1">{contract.dateend ? formatDate(contract.dateend) : "-"}</p>
              </div>
            </div>

            {contract.description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Description</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{contract.description}</p>
              </div>
            )}

            {contract.content && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Terms</p>
                <div className="prose prose-sm max-w-none text-foreground/80" dangerouslySetInnerHTML={{ __html: contract.content }} />
              </div>
            )}

            {contract.is_signed && (
              <div className="border-t border-border/40 pt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Signature</p>
                <div className="flex items-center gap-4">
                  {contract.signature_data && (
                    <img src={contract.signature_data} alt="Signature" className="h-16 border border-border/40 rounded-lg bg-white px-2" />
                  )}
                  <div className="text-sm">
                    <p className="font-bold">{contract.signer_firstname} {contract.signer_lastname}</p>
                    <p className="text-muted-foreground">{contract.signer_email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Signed on {contract.signed_at ? formatDate(contract.signed_at) : "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sign Contract Modal */}
      <Dialog open={isSignOpen} onOpenChange={setIsSignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">First Name</Label>
                <Input value={signerFirstName} onChange={(e) => setSignerFirstName(e.target.value)} placeholder="First name" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Name</Label>
                <Input value={signerLastName} onChange={(e) => setSignerLastName(e.target.value)} placeholder="Last name" className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="you@example.com" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signature</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs font-bold" onClick={handleUndoSignature}>
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs font-bold" onClick={handleClearSignature}>
                    <Eraser className="h-3.5 w-3.5" /> Clear
                  </Button>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={456}
                height={180}
                className="w-full border-2 border-dashed border-border rounded-xl bg-white cursor-crosshair touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <p className="text-[10px] text-muted-foreground italic">Draw your signature above using your mouse.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSignOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={handleSign} disabled={signMutation.isPending} className="font-bold">
              {signMutation.isPending ? "Signing..." : "Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
