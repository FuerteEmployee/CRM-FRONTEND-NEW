import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { Edit } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="text-sm font-bold text-slate-800 break-words">
      {value === undefined || value === null || value === "" ? "—" : value}
    </p>
  </div>
);

interface LeadProfileTabProps {
  lead: any;
  customFieldDefs: any[];
  onEditClick: () => void;
}

export function LeadProfileTab({ lead, customFieldDefs, onEditClick }: LeadProfileTabProps) {
  const { formatAmount } = useCurrency();
  const assignedName = lead.assigned
    ? [lead.assigned.firstname, lead.assigned.lastname].filter(Boolean).join(" ")
    : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {lead.status?.name && <Badge className="rounded-lg font-bold">{lead.status.name}</Badge>}
          {lead.is_public && <Badge variant="outline" className="rounded-lg font-bold">Public</Badge>}
          {lead.contacted_today && <Badge variant="outline" className="rounded-lg font-bold text-emerald-600 border-emerald-200">Contacted Today</Badge>}
        </div>
        <Button onClick={onEditClick} size="sm" className="h-9 rounded-xl px-4 font-black uppercase text-[10px] tracking-widest gap-2">
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <Field label="Name" value={lead.name} />
        <Field label="Company" value={lead.company} />
        <Field label="Position" value={lead.position || lead.title} />
        <Field label="Email" value={lead.email} />
        <Field
          label="Phone"
          value={
            lead.phonenumber ? (
              <WhatsAppQuickChat phone={lead.phonenumber} data={{ customer_name: lead.name, lead_id: lead._id }} />
            ) : undefined
          }
        />
        <Field label="Website" value={lead.website} />
        <Field label="Source" value={lead.source?.name} />
        <Field label="Assigned To" value={assignedName} />
        <Field label="Lead Value" value={lead.lead_value ? formatAmount(Number(lead.lead_value)) : undefined} />
        <Field label="Tags" value={Array.isArray(lead.tags) ? lead.tags.join(", ") : lead.tags} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-6 border-t border-slate-100">
        <Field label="Address" value={lead.address} />
        <Field label="City" value={lead.city} />
        <Field label="State" value={lead.state} />
        <Field label="Country" value={lead.country} />
        <Field label="Zip" value={lead.zip} />
        <Field label="Default Language" value={lead.default_language} />
      </div>

      {lead.description && (
        <div className="pt-6 border-t border-slate-100 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</p>
          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{lead.description}</p>
        </div>
      )}

      {customFieldDefs.length > 0 && (
        <div className="pt-6 border-t border-slate-100 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Fields</p>
          <div className="grid grid-cols-2 gap-3">
            {customFieldDefs.map((cf: any) => (
              <div key={cf._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{cf.name}</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {lead.custom_fields?.[cf.slug] ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-6 border-t border-slate-100">
        <Field label="Created" value={lead.createdAt ? formatDate(lead.createdAt) : undefined} />
        <Field label="Last Modified" value={lead.updatedAt ? formatDate(lead.updatedAt) : undefined} />
      </div>
    </div>
  );
}
