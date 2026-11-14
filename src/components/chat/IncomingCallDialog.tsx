import { Phone, PhoneOff, Users, Video } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/context/CallContext";

const initials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase() || "?";

/** "📞 Asha is calling" card, shown on any CRM page while a call rings. */
export const IncomingCallDialog = () => {
  const { state, accept, reject } = useCall();
  const inc = state.incoming;
  if (state.phase !== "incoming" || !inc) return null;

  const name = `${inc.from.firstname} ${inc.from.lastname}`.trim();
  const isVideo = inc.type === "video";

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`Incoming ${isVideo ? "video" : "voice"} call from ${name}`}
      className="fixed z-[70] top-4 right-4 left-4 sm:left-auto sm:w-80 rounded-2xl border bg-card text-card-foreground shadow-2xl p-4 animate-in slide-in-from-top-4"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-success/40 animate-ping" />
          <Avatar className="h-12 w-12 relative">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {inc.isGroup ? <Users className="h-5 w-5" /> : initials(inc.from.firstname, inc.from.lastname)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {inc.isGroup ? `Group ${isVideo ? "video" : "voice"} call · ${inc.groupName}` : `Incoming ${isVideo ? "video" : "voice"} call`}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="destructive" onClick={reject} className="gap-2">
          <PhoneOff className="h-4 w-4" /> Decline
        </Button>
        <Button onClick={accept} className="gap-2 bg-success text-white hover:bg-success/90">
          {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />} Accept
        </Button>
      </div>
    </div>
  );
};
