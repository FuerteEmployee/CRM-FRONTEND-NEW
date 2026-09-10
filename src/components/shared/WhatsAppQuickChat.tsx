import { MessageCircle, Phone } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  buildWhatsappUrl,
  normalizeWhatsappPhone,
  DEFAULT_WHATSAPP_QC_TEMPLATES,
  type WhatsappQcTemplateEntry,
} from "@/lib/whatsappQuickChat";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppQuickChatProps {
  phone?: string | null;
  data?: {
    customer_name?: string;
    lead_id?: string;
    invoice_no?: string;
    /** Overrides the current logged-in user as {staff_name}, if needed. */
    staff_name?: string;
  };
  className?: string;
}

const ICON_BUTTON_CLASS = "inline-flex items-center gap-1.5 text-left text-green-700 hover:text-green-800 transition-colors";

// One shared component reused everywhere a phone number is rendered
// (Leads, Customers, Sales, Invoices, Staff Directory, ...). It owns the
// whole "icon + number" unit rather than just an icon bolted on next to a
// number a caller renders itself — when WhatsApp Quick Chat is enabled and
// the number is usable, the phone icon a page used to show is replaced by
// the WhatsApp icon and the whole thing becomes a click-to-chat link;
// otherwise it falls back to the plain non-clickable phone icon + number
// every page showed before this feature existed, so nothing regresses for
// tenants who leave it off (or a row with a missing/invalid phone).
//
// When the admin has configured more than one named template, clicking
// opens a small menu to pick which one to send instead of assuming one.
export function WhatsAppQuickChat({ phone, data, className }: WhatsAppQuickChatProps) {
  const { getSetting } = useSettings();
  const { user } = usePermissions();

  if (!phone) return null;

  const enabled = getSetting("whatsappQcEnabled", false) === true;
  const rawTemplates = getSetting("whatsappQcTemplates", DEFAULT_WHATSAPP_QC_TEMPLATES);
  const templates: WhatsappQcTemplateEntry[] =
    Array.isArray(rawTemplates) && rawTemplates.length > 0 ? rawTemplates : DEFAULT_WHATSAPP_QC_TEMPLATES;
  const companyName = getSetting("companyName", "");
  const staffName = data?.staff_name || [user?.firstname, user?.lastname].filter(Boolean).join(" ");

  const isUsablePhone = enabled && !!normalizeWhatsappPhone(phone);

  if (!isUsablePhone) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <Phone className="h-3 w-3 text-slate-300 shrink-0" />
        {phone}
      </span>
    );
  }

  const openWithTemplate = (templateText: string) => {
    const url = buildWhatsappUrl(phone, templateText, {
      customer_name: data?.customer_name,
      lead_id: data?.lead_id,
      invoice_no: data?.invoice_no,
      company_name: companyName,
      staff_name: staffName,
    });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // Only one template configured — open it directly, no need to make
  // someone pick from a menu of one.
  if (templates.length <= 1) {
    return (
      <button
        type="button"
        title="Chat on WhatsApp"
        onClick={(e) => {
          e.stopPropagation();
          openWithTemplate(templates[0].template);
        }}
        className={cn(ICON_BUTTON_CLASS, className)}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
        {phone}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Choose a message to send"
          onClick={(e) => e.stopPropagation()}
          className={cn(ICON_BUTTON_CLASS, className)}
        >
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
          {phone}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => openWithTemplate(t.template)}>
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
