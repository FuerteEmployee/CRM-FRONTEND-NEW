import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { usePermissionContext } from "@/context/PermissionContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = usePermissionContext();
  const [meetingLeft, setMeetingLeft] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Copied!", description: "Meeting link copied to clipboard." });
  };

  if (meetingLeft) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center gap-4 bg-card rounded-lg border">
          <h2 className="text-3xl font-bold mb-2">You left the meeting</h2>
          <p className="text-muted-foreground mb-4">Hope it was productive!</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setMeetingLeft(false)}>Rejoin</Button>
            <Button onClick={() => navigate("/admin/meetings")}>Return to Meetings</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/meetings")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-semibold text-sm">Meeting Room</h3>
              <p className="text-xs text-muted-foreground font-mono">ID: {roomId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
              <Copy className="h-3 w-3" />
              Copy Link
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setMeetingLeft(true)}>
              Leave
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-black">
          <JitsiMeeting
            roomName={`CRM_Meeting_${roomId}`}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              prejoinPageEnabled: true,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            userInfo={{
              displayName: `${user?.firstname} ${user?.lastname}`,
            }}
            onApiReady={(externalApi) => {
              externalApi.addListener('readyToClose', () => {
                setMeetingLeft(true);
              });
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
