import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  className?: string;
}

export const Loading = ({ 
  message = "Loading data...", 
  className = "p-16" 
}: LoadingProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 w-full ${className}`}>
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-semibold text-muted-foreground animate-pulse text-lg tracking-tight">
        {message}
      </p>
    </div>
  );
};
