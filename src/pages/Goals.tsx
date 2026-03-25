import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Crosshair, TrendingUp, Target } from "lucide-react";
import { useState } from "react";

const goals = [
  { id: "g1", title: "Increase Monthly Revenue", target: "$50,000", current: "$38,200", progress: 76, status: "On Track", deadline: "2026-06-30" },
  { id: "g2", title: "Acquire 20 New Customers", target: "20", current: "14", progress: 70, status: "On Track", deadline: "2026-06-30" },
  { id: "g3", title: "Reduce Churn to 5%", target: "5%", current: "7.2%", progress: 40, status: "Behind", deadline: "2026-12-31" },
  { id: "g4", title: "Launch Mobile App", target: "100%", current: "55%", progress: 55, status: "On Track", deadline: "2026-05-30" },
  { id: "g5", title: "Team Satisfaction Score 9+", target: "9.0", current: "8.4", progress: 93, status: "Almost There", deadline: "2026-03-31" },
];

const statusColors: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  Behind: "bg-destructive/10 text-destructive border-destructive/20",
  "Almost There": "bg-warning/10 text-warning border-warning/20",
  Achieved: "bg-primary/10 text-primary border-primary/20",
};

const Goals = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Goals</h1><p className="text-muted-foreground">Track your business goals and OKRs</p></div>
          <Dialog><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Goal</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2"><div className="space-y-2"><Label>Title</Label><Input placeholder="Goal title" /></div><div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the goal" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Target</Label><Input placeholder="Target value" /></div><div className="space-y-2"><Label>Deadline</Label><Input type="date" /></div></div><Button className="w-full">Create Goal</Button></div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
          <Card className="hover-lift"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><Target className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{goals.filter(g => g.status === "On Track").length}</p><p className="text-xs text-muted-foreground">On Track</p></div></CardContent></Card>
          <Card className="hover-lift"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><TrendingUp className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{goals.filter(g => g.status === "Almost There").length}</p><p className="text-xs text-muted-foreground">Almost There</p></div></CardContent></Card>
          <Card className="hover-lift"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><Crosshair className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{goals.filter(g => g.status === "Behind").length}</p><p className="text-xs text-muted-foreground">Behind</p></div></CardContent></Card>
        </div>

        <div className="space-y-4">
          {goals.map((goal) => (
            <Card key={goal.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold">{goal.title}</h3><p className="text-xs text-muted-foreground">Deadline: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                  <Badge variant="outline" className={`text-xs ${statusColors[goal.status]}`}>{goal.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm mb-2"><span className="text-muted-foreground">Current: {goal.current}</span><span className="font-medium">Target: {goal.target}</span></div>
                <Progress value={goal.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{goal.progress}%</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Goals;
