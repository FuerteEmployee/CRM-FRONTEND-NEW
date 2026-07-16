import { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/hrms/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [resolveRef, setResolveRef] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolveRef({ resolve });
      setOpen(true);
    });
  };

  const handleCancel = () => {
    setOpen(false);
    resolveRef?.resolve(false);
  };

  const handleConfirm = () => {
    setOpen(false);
    resolveRef?.resolve(true);
  };

  const variant = options.variant || "danger";
  const iconColor =
    variant === "danger"
      ? "text-rose-500 bg-rose-50 border-rose-100"
      : variant === "warning"
      ? "text-amber-500 bg-amber-50 border-amber-100"
      : "text-blue-500 bg-blue-50 border-blue-100";

  const actionButtonColor =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/10 focus:ring-rose-500"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/10 focus:ring-amber-500"
      : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/10 focus:ring-blue-500";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-[400px] p-6 border border-slate-100 bg-white rounded-2xl shadow-xl font-outfit">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-3 rounded-full border ${iconColor}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <AlertDialogHeader className="space-y-1.5">
              <AlertDialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                {options.title || "Confirm Action"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed font-medium">
                {options.description || "Are you sure you want to perform this action? This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex flex-row items-center justify-center gap-3 w-full pt-2">
              <AlertDialogCancel
                onClick={handleCancel}
                className="flex-1 h-9 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all uppercase tracking-wider"
              >
                {options.cancelText || "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${actionButtonColor}`}
              >
                {options.confirmText || "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
};
