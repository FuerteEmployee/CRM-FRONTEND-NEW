import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TableActions({ onView, onEdit, onDelete }: TableActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {onView && (
        <Button variant="ghost" size="icon" onClick={onView} title="View" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors">
          <Eye className="h-4 w-4 text-primary" />
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="icon" onClick={onEdit} title="Edit" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      )}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 rounded-lg hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
