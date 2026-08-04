import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  MapPin,
  User,
  Tag as TagIcon,
} from "lucide-react";
import { leadService } from "@/api/services/lead.service";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";

interface LeadDetail {
  _id: string;
  name: string;
  position?: string;
  company?: string;
  email?: string;
  phonenumber?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  lead_value?: string;
  tags?: string;
  description?: string;
  status?: { _id: string; name: string; color?: string } | null;
  source?: { _id: string; name: string } | null;
  assigned?: { _id: string; firstname?: string; lastname?: string } | null;
  createdAt?: string;
}

const LeadView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ["leads", id],
    queryFn: () => leadService.getById(id as string),
    enabled: !!id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="h-10 w-10 p-0 rounded-xl"
            onClick={() => navigate("/leads")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? "Loading lead..." : lead?.name || "Lead"}
            </h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              Lead Details
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        ) : !lead ? (
          <Card className="rounded-3xl border-slate-100 shadow-sm">
            <CardContent className="p-20 text-center">
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                Lead not found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-3xl border-slate-100 shadow-sm">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {lead.position || "Lead"}
                    </p>
                    {lead.status && (
                      <Badge
                        className="mt-2 rounded-lg border-none font-black text-[9px] uppercase tracking-wider px-2 h-5"
                        style={{
                          backgroundColor: `${lead.status.color || "#757575"}1a`,
                          color: lead.status.color || "#757575",
                        }}
                      >
                        {lead.status.name}
                      </Badge>
                    )}
                  </div>
                  {lead.lead_value && Number(lead.lead_value) > 0 && (
                    <p className="text-xl font-black text-slate-900">
                      {formatAmount(Number(lead.lead_value))}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Building2 className="h-4 w-4 text-slate-300" /> {lead.company}
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Mail className="h-4 w-4 text-slate-300" /> {lead.email}
                    </div>
                  )}
                  {lead.phonenumber && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Phone className="h-4 w-4 text-slate-300" /> {lead.phonenumber}
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Globe className="h-4 w-4 text-slate-300" /> {lead.website}
                    </div>
                  )}
                  {(lead.address || lead.city || lead.state || lead.country) && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-slate-300" />
                      {[lead.address, lead.city, lead.state, lead.country, lead.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>

                {lead.tags && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <TagIcon className="h-4 w-4 text-slate-300" />
                    {lead.tags.split(",").map((t) => (
                      <Badge
                        key={t}
                        className="bg-slate-50 text-slate-500 border-none rounded-md text-[9px] font-black uppercase px-2 h-5"
                      >
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                {lead.description && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Description
                    </p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-100 shadow-sm">
              <CardContent className="p-8 space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Assigned To
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {lead.assigned
                        ? `${lead.assigned.firstname || ""} ${lead.assigned.lastname || ""}`.trim()
                        : "Unassigned"}
                    </span>
                  </div>
                </div>

                {lead.source && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Source
                    </p>
                    <p className="text-sm font-bold text-slate-700">{lead.source.name}</p>
                  </div>
                )}

                {lead.createdAt && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Created
                    </p>
                    <p className="text-sm font-bold text-slate-700">{formatDate(lead.createdAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeadView;
