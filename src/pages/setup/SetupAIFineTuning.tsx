import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bot, FileText, Database, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SetupAIFineTuning() {
  const navigate = useNavigate();
  const [baseModel, setBaseModel] = useState("gpt-4o-mini-2024-07-18");
  
  // Dummy data counts representing database fetch
  const availableArticles = 3;
  const predefinedReplies = 4;
  const totalItems = availableArticles + predefinedReplies;
  const isEligibleForFineTuning = totalItems >= 10;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/setup/settings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">OpenAI Fine-Tuning</h1>
              <p className="text-sm text-muted-foreground">Train explicit knowledge base models inside your OpenAI account.</p>
            </div>
          </div>
          <Button disabled={!isEligibleForFineTuning} className="gap-2">
            <Bot className="h-4 w-4" />
            Start Fine-Tuning Job
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Source Data for Fine-Tuning
                </span>
                <Badge variant={isEligibleForFineTuning ? "default" : "destructive"}>
                  {totalItems} / 10 required
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background border rounded-lg flex flex-col gap-1 items-center justify-center text-center">
                  <span className="text-3xl font-bold font-mono">{availableArticles}</span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Available Articles
                  </span>
                </div>
                <div className="p-4 bg-background border rounded-lg flex flex-col gap-1 items-center justify-center text-center">
                  <span className="text-3xl font-bold font-mono">{predefinedReplies}</span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Predefined Replies
                  </span>
                </div>
              </div>
              
              {!isEligibleForFineTuning ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
                  You need at least 10 knowledge base articles or predefined replies for fine-tuning. Currently you have {totalItems}.
                </div>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm font-medium">
                  You have enough training payload data to start a fine-tuning background job.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Fine-Tuning Base Model
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-bold">Select OpenAI Target Base Model</Label>
                <Select value={baseModel} onValueChange={setBaseModel}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select Base Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 (2025-04-14)</SelectItem>
                    <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini (2025-04-14)</SelectItem>
                    <SelectItem value="gpt-4o-2024-08-06">GPT-4o (2024-08-06)</SelectItem>
                    <SelectItem value="gpt-4o-mini-2024-07-18">GPT-4o Mini (2024-07-18)</SelectItem>
                    <SelectItem value="gpt-4-0613">GPT-4 (0613)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (0125)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo-1106">GPT-3.5 Turbo (1106)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo-0613">GPT-3.5 Turbo (0613)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 italic">
                  This is the base model that will be used for fine-tuning. Different models have different capabilities and price points depending on your OpenAI Account tier limits.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Last Fine-Tuning Job
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12 flex flex-col justify-center items-center">
            <p className="text-sm text-muted-foreground italic">No recent jobs found on this workspace.</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Fine-Tuned Models
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12 flex flex-col justify-center items-center">
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground opacity-50" />
             </div>
             <h3 className="font-semibold text-lg text-foreground/80 mb-1">No Models Found</h3>
             <p className="text-sm text-muted-foreground text-center max-w-md">
               No fine-tuned models available yet. Start your first job above using available articles and predefined templates.
             </p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
