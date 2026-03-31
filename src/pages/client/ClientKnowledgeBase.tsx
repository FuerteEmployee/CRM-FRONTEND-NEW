import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, MessageSquare, Zap, Shield, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  { title: "Getting Started", icon: Zap, color: "text-amber-500", bgColor: "bg-amber-50", articles: 12 },
  { title: "Account & Billing", icon: Shield, color: "text-blue-500", bgColor: "bg-blue-50", articles: 8 },
  { title: "Project Guide", icon: FileText, color: "text-indigo-500", bgColor: "bg-indigo-50", articles: 15 },
  { title: "Common Issues", icon: MessageSquare, color: "text-rose-500", bgColor: "bg-rose-50", articles: 24 },
];

export default function ClientKnowledgeBase() {
  return (
    <div className="space-y-16 py-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 p-12 md:p-20 text-center space-y-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500 rounded-full blur-[100px]" />
        </div>

        <div className="space-y-4 relative z-10">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">How can we help?</h1>
          <p className="text-slate-300 text-lg font-medium max-w-xl mx-auto">Explore our guides and articles to get the most out of your experience.</p>
        </div>

        <div className="relative max-w-2xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/10 p-1.5 focus-within:ring-4 focus-within:ring-primary/20 transition-all z-10">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search for articles, guides..." 
              className="pl-12 h-14 border-none bg-transparent text-white placeholder:text-slate-400 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 ml-2">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {categories.map((cat, i) => (
          <Card key={cat.title} className="group border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.05] hover:shadow-[0_12px_45px_rgb(0,0,0,0.08)] cursor-pointer rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className={`p-4 rounded-[1.5rem] w-fit mx-auto ${cat.bgColor} transition-transform group-hover:rotate-12 duration-300 shadow-sm border border-white/20`}>
                <cat.icon className={`h-8 w-8 ${cat.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">{cat.title}</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{cat.articles} Articles</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State / Bottom Text */}
      <div className="px-4 text-center space-y-4">
          <div className="w-16 h-1 bg-slate-100 mx-auto rounded-full" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">No featured articles found</p>
      </div>
    </div>
  );
}
