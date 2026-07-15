import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle } from "lucide-react";

interface InquiryOutcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskName?: string;
  onSelect: (outcome: "Won" | "Lost") => void;
}

export const InquiryOutcomeDialog = ({ isOpen, onClose, taskName, onSelect }: InquiryOutcomeDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inquiry Outcome</DialogTitle>
          <DialogDescription>
            {taskName ? `"${taskName}" is an Inquiry.` : "This task is an Inquiry."} How did it close?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            onClick={() => onSelect("Won")}
            className="h-24 rounded-2xl flex flex-col gap-2 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20"
          >
            <Trophy className="h-6 w-6" />
            Won
          </Button>
          <Button
            onClick={() => onSelect("Lost")}
            className="h-24 rounded-2xl flex flex-col gap-2 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
          >
            <XCircle className="h-6 w-6" />
            Lost
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose} className="font-bold w-full">Cancel</Button>
      </DialogContent>
    </Dialog>
  );
};
