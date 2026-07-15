import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/hrms/components/ui/badge";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { DataTable } from "@/hrms/components/common/DataTable";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Briefcase,
  Users,
} from "lucide-react";
import { designationService } from "@/hrms/services/designationService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { toast } from "@/hrms/hooks/use-toast";
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
} from "@/hrms/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import { Label } from "@/hrms/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/hrms/components/ui/form";

const designationSchema = z.object({
  name: z.string().min(2, "Designation name must be at least 2 characters"),
  code: z.string().min(2, "Designation code must be at least 2 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type DesignationFormValues = z.infer<typeof designationSchema>;

export default function DesignationPage() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const [designations, setDesignations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDesg, setEditingDesg] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DesignationFormValues>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (editingDesg) {
      form.reset({
        name: editingDesg.name,
        code: editingDesg.code,
        description: editingDesg.description || "",
        isActive: editingDesg.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        isActive: true,
      });
    }
  }, [editingDesg, isAddOpen, form]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await designationService.getAll();
      setDesignations(data);
    } catch (error) {
      console.error("Failed to load designations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDesignations = useMemo(() => {
    return designations.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [designations, searchQuery]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete Designation", description: "This designation will be permanently deleted. This action cannot be undone.", variant: "danger" });
    if (!ok) return;
    try {
      await designationService.delete(id);
      setDesignations(designations.filter((d) => d._id !== id));
      toast({
        title: "Designation Deleted",
        description: "The designation has been removed successfully.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete designation",
        variant: "destructive",
      });
    }
  };

  const onFormSubmit = async (values: DesignationFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingDesg) {
        const updated = await designationService.update(editingDesg._id, values);
        setDesignations(designations.map((d) => (d._id === editingDesg._id ? updated : d)));
        toast({
          title: "Designation Updated",
          description: `${updated.name} has been updated.`,
        });
      } else {
        const newDesg = await designationService.create(values);
        setDesignations([...designations, newDesg]);
        toast({
          title: "Designation Created",
          description: `${newDesg.name} has been added.`,
        });
      }
      setIsAddOpen(false);
      setEditingDesg(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <PageHeader
          title="Designations"
          subtitle="Manage organizational roles and position titles"
        />
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingDesg(null);
          }}
        >
          {hasPermission("manage_designations") && (
            <DialogTrigger asChild>
              <Button
                className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Designation
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="bg-white border-0 rounded-[2.5rem] max-w-lg shadow-2xl p-0 overflow-hidden flex flex-col">
            <DialogHeader className="p-8 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-soft">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    {editingDesg ? "Update Designation" : "New Designation"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                    Define position names and official titles.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6 px-8 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-foreground/70">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Senior Manager" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-foreground/70">Short Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SNR-MGR" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground/70">Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Position details..." {...field} className="h-12 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="py-6 pt-2 flex items-center gap-3">
                  <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)} className="rounded-xl h-12">
                    Cancel
                  </Button>
                  <Button disabled={isSubmitting} type="submit" className="flex-1 rounded-xl h-12 gradient-primary font-bold shadow-glow">
                    {isSubmitting && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                    {editingDesg ? "Save Changes" : "Create Designation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-soft">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Designation List</h2>
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest">
                {filteredDesignations.length} Active Designations
              </p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search designations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-xl border-gray-200 bg-white"
            />
          </div>
        </div>

        <DataTable
          data={filteredDesignations}
          isLoading={isLoading}
          columns={[
            {
              header: "Designation Name",
              accessorKey: (d) => (
                <div className="font-bold text-foreground">{d.name}</div>
              ),
            },
            {
              header: "Code",
              accessorKey: (d) => (
                <Badge variant="outline" className=" bg-gray-50 border-gray-200 text-gray-600 px-3 py-0.5 rounded-lg">
                  {d.code}
                </Badge>
              ),
            },
            {
              header: "Status",
              accessorKey: (d) => (
                <Badge className={d.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-600 border-gray-100"}>
                  {d.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              header: <div className="sticky right-0 bg-inherit px-3 z-20 text-right">Actions</div>,
              className: "sticky right-0 bg-inherit z-10 text-right border-l border-slate-50 shadow-[-12px_0_15px_-12px_rgba(0,0,0,0.1)]",
              accessorKey: (d) => (
                <div className="flex items-center justify-end gap-2 pr-2">
                  {hasPermission("manage_designations") && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                        onClick={() => {
                          setEditingDesg(d);
                          setIsAddOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => handleDelete(d._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
