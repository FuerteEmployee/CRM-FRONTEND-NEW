import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, PhoneOff, StickyNote } from "lucide-react";
import { formatDateTime } from "@/lib/dateFormat";
import { noteService } from "@/api/services/note.service";
import { toast } from "sonner";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  contacted: { label: "Contacted", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  not_contacted: { label: "Not Contacted", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  general: { label: "General", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function LeadNotesTab({ lead }: { lead: any }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-notes", lead._id],
    queryFn: () => noteService.getAll(lead._id, "lead"),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { description: string; type?: string }) =>
      noteService.create({ rel_id: lead._id, rel_type: "lead", ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", lead._id] });
      setNewNote("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add note"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => createNoteMutation.mutate({ description: "Got in touch with this lead", type: "contacted" })}
          disabled={createNoteMutation.isPending}
          className="h-9 rounded-xl px-4 font-bold text-xs gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          I got in touch with this lead
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => createNoteMutation.mutate({ description: "Have not contacted this lead", type: "not_contacted" })}
          disabled={createNoteMutation.isPending}
          className="h-9 rounded-xl px-4 font-bold text-xs gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          I have not contacted this lead
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Write a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[80px] rounded-xl bg-slate-50/50 border-slate-300"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => createNoteMutation.mutate({ description: newNote, type: "general" })}
            disabled={!newNote.trim() || createNoteMutation.isPending}
            className="h-9 rounded-xl px-5 font-black uppercase text-[10px] tracking-widest"
          >
            {createNoteMutation.isPending ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <StickyNote className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-sm text-slate-400 font-medium">No notes yet for this lead</p>
          </div>
        ) : (
          notes.map((note: any) => {
            const badge = TYPE_BADGE[note.type || "general"];
            const authorName = note.addedfrom
              ? [note.addedfrom.firstname, note.addedfrom.lastname].filter(Boolean).join(" ")
              : "—";
            return (
              <div key={note._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`rounded-lg font-bold text-[10px] ${badge.className}`}>{badge.label}</Badge>
                  <span className="text-[10px] font-bold text-slate-400">{formatDateTime(note.dateadded)}</span>
                </div>
                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{note.description}</p>
                <p className="text-[10px] font-bold text-slate-400">by {authorName}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
