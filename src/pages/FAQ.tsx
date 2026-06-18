import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqService } from "@/api/services/faq.service";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Save, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function FAQ() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "General",
    status: "Active"
  });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: faqService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: faqService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast({ title: "FAQ added successfully", variant: "default" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add FAQ", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => faqService.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast({ title: "FAQ updated successfully", variant: "default" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update FAQ", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: faqService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast({ title: "FAQ deleted successfully", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to delete FAQ", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({ question: "", answer: "", category: "General", status: "Active" });
    setEditingFaq(null);
  };

  const openModal = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || "General",
        status: faq.status || "Active"
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.question || !formData.answer) {
      toast({ title: "Question and Answer are required", variant: "destructive" });
      return;
    }
    
    if (editingFaq) {
      updateMutation.mutate({ id: editingFaq._id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this FAQ?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter faqs by search query
  const filteredFaqs = Array.isArray(faqs) ? faqs.filter((faq: any) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (faq.question && faq.question.toLowerCase().includes(searchLower)) ||
      (faq.answer && faq.answer.toLowerCase().includes(searchLower)) ||
      (faq.category && faq.category.toLowerCase().includes(searchLower))
    );
  }) : [];

  // Group faqs by category
  const faqsByCategory = filteredFaqs.reduce((acc: any, faq: any) => {
    const cat = faq.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage FAQs and dynamic knowledge base content.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-background"
              />
            </div>
            <Button onClick={() => openModal()} className="shadow-lg shadow-primary/20 gap-2 font-bold uppercase tracking-widest text-[10px] shrink-0">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(faqsByCategory).length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center h-48 pt-6">
              <p className="text-muted-foreground mb-4 font-medium">No FAQs found. Let's create some.</p>
              <Button onClick={() => openModal()} variant="outline">Create FAQ</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.keys(faqsByCategory).map((category) => (
              <div key={category} className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                  {category} <Badge variant="secondary">{faqsByCategory[category].length}</Badge>
                </h2>
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {faqsByCategory[category].map((faq: any) => (
                    <AccordionItem key={faq._id} value={faq._id} className="bg-card border shadow-sm rounded-xl px-4 py-2">
                      <AccordionTrigger className="hover:no-underline font-medium text-[14px] text-left pr-4 flex justify-between">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="flex-1 text-[14px]">{faq.question}</span>
                          <div className="flex items-center gap-2 mr-2">
                            {faq.status === 'Inactive' && <Badge variant="destructive" className="mr-2 text-[10px]">Draft</Badge>}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openModal(faq); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(faq._id, e)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-[13px] leading-relaxed pt-2">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Question <span className="text-destructive">*</span></label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="E.g., How do I reset my password?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Answer <span className="text-destructive">*</span></label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a detailed answer here..."
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="General, Billing, Support..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Status</label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editingFaq ? "Save Changes" : "Save FAQ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
