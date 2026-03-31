import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  Calendar,
  ChevronRight,
  LayoutGrid,
  ListFilter,
} from "lucide-react";

const projects = [
  {
    id: 1,
    name: "Website Redesign",
    status: "Active",
    due: "2024-05-15",
    progress: 65,
    category: "Development",
  },
  {
    id: 2,
    name: "SEO Optimization",
    status: "Active",
    due: "2024-06-01",
    progress: 40,
    category: "Marketing",
  },
  {
    id: 3,
    name: "Mobile App Development",
    status: "Pending",
    due: "2024-07-10",
    progress: 0,
    category: "Development",
  },
];

export default function ClientProjects() {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Your Projects
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Detailed view of your project structure and progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-all gap-2 text-foreground font-semibold h-9 rounded-full px-4"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-all gap-2 text-foreground font-semibold h-9 rounded-full px-4"
          >
            <ListFilter className="h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {projects.map((project, index) => (
          <Card
            key={project.id}
            className="group border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.005] hover:shadow-[0_8px_35px_rgb(0,0,0,0.06)] rounded-2xl"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-4 pt-6 px-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                      {project.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Due {project.due}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {project.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Badge
                    className={`px-4 py-1.5 rounded-full font-bold text-[11px] shadow-sm tracking-widest ${
                      project.status === "Active"
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                    }`}
                  >
                    {project.status.toUpperCase()}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full h-9 px-5 bg-slate-50 text-foreground hover:bg-slate-100 gap-1.5 font-bold text-xs transition-all flex-1 sm:flex-none"
                  >
                    Details{" "}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-2">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Project Completion
                  </span>
                  <span className="text-lg font-black text-slate-900 tracking-tighter">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
