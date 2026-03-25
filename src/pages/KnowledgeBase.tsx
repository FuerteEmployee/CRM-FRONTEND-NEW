import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, BookOpen, Eye, ThumbsUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { Skeleton } from "@/components/ui/skeleton";

const KnowledgeBase = () => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["kb-groups"],
    queryFn: supportService.getKBGroups,
  });

  const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["kb-articles", selectedGroupId],
    queryFn: () =>
      supportService.getKBArticles(
        selectedGroupId === "all" ? null : selectedGroupId
      ),
  });

  const filtered = articles.filter((a: any) =>
    (a.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Articles, guides, and documentation
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Article</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input placeholder="Article subject" />
                </div>
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => (
                        <SelectItem key={g._id} value={g._id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="internal-article" />
                    <Label htmlFor="internal-article" className="font-normal">
                      Internal Article
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="disabled-article" />
                    <Label htmlFor="disabled-article" className="font-normal">
                      Disabled
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Article Description</Label>
                  <Textarea
                    placeholder="Write article content..."
                    className="min-h-[150px]"
                  />
                </div>
                <Button className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={selectedGroupId === "all" ? "default" : "outline"}
              onClick={() => setSelectedGroupId("all")}
            >
              All
            </Button>
            {groups.map((group: any) => (
              <Button
                key={group._id}
                size="sm"
                variant={selectedGroupId === group._id ? "default" : "outline"}
                onClick={() => setSelectedGroupId(group._id)}
                className="capitalize"
              >
                {group.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoadingArticles || isLoadingGroups
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            : filtered.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                   No articles found.
                </div>
            ) : (
                filtered.map((article: any) => (
                  <Card
                    key={article._id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">
                            {article.title || article.subject}
                          </CardTitle>
                        </div>
                      </div>
                      <Badge variant="outline" className="w-fit text-xs">
                        {article.group_name || "General"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {article.description || "No excerpt available."}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>By {article.author || "Admin"}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {article.likes || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )
          }
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
