import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { usePermissionContext } from "@/context/PermissionContext";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ArrowLeft, Mic, MicOff, Save, FileText, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { meetingService } from "@/api/services/meeting.service";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = usePermissionContext();
  const [meetingLeft, setMeetingLeft] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [summary, setSummary] = useState("");
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);

  const { data: meeting } = useQuery({
    queryKey: ["meeting", roomId],
    queryFn: () => meetingService.getMeeting(roomId),
    enabled: !!roomId,
  });

  useEffect(() => {
    if (meeting?.data?.summary) {
      setSummary(meeting.data.summary);
    }
  }, [meeting]);

  const updateMutation = useMutation({
    mutationFn: (summaryText: string) => meetingService.updateMeeting(roomId, { summary: summaryText }),
    onSuccess: () => {
      toast({ title: "Saved", description: "Meeting summary saved successfully.", className: "bg-emerald-600 text-white border-none" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save summary.", variant: "destructive" });
    }
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Copied!", description: "Meeting link copied to clipboard." });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast({ title: "Voice Typing Stopped", description: "Voice recognition has been stopped." });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not Supported", description: "Your browser does not support voice typing.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setSummary((prev) => prev + (prev ? '\n' : '') + finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
        toast({ title: "Voice Error", description: "An error occurred with voice typing.", variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      toast({ title: "Voice Typing Started", description: "Speak now to record notes." });
    } catch(e) {
      console.error(e);
      toast({ title: "Error", description: "Could not start voice recognition.", variant: "destructive" });
    }
  };

  const handleSaveSummary = () => {
    updateMutation.mutate(summary);
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
      <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-background">
        <div className="flex flex-col flex-1 min-w-0">
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
              <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="gap-2 font-bold bg-accent/10">
                {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                Notes
              </Button>
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

        {/* Sidebar for Summary */}
        {isSidebarOpen && (
          <div className="w-80 border-l bg-card flex flex-col transition-all duration-300 shadow-xl z-10">
            <div className="p-4 border-b flex items-center gap-2 bg-gradient-to-r from-accent/10 to-transparent">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm tracking-tight">Meeting Summary & Notes</h3>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Real-time Notes</p>
                <Button 
                  size="sm" 
                  variant={isListening ? "destructive" : "secondary"} 
                  className={`h-8 gap-2 text-[10px] font-black uppercase tracking-widest ${isListening ? 'animate-pulse' : ''}`}
                  onClick={toggleListening}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3 w-3" />
                      Stop Dictation
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3 text-primary" />
                      Voice Type
                    </>
                  )}
                </Button>
              </div>
              
              <Textarea 
                className="flex-1 resize-none bg-background border-border/50 p-4 text-sm font-medium focus-visible:ring-primary/20 leading-relaxed custom-scrollbar shadow-inner"
                placeholder="Type or dictate notes here...&#10;&#10;Key points, action items, and decisions will be saved to the meeting record."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              
              <Button 
                className="w-full gap-2 font-black uppercase tracking-widest text-xs h-11 shadow-lg shadow-primary/20 rounded-xl" 
                onClick={handleSaveSummary}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Summary"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
