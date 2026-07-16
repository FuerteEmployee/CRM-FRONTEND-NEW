import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backPath?: string;
}

export function PageHeader({ title, subtitle, action, backPath }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full">
      <div className="flex items-start gap-3">
        {backPath && (
          <Link
            to={backPath}
            className="mt-1 h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 shadow-sm transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
