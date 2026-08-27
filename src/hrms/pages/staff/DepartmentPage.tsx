import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/hrms/components/ui/badge";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { DataTable } from "@/hrms/components/common/DataTable";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import {
    Plus,
    Building2,
    Search,
    Edit2,
    Trash2,
    User,
    Building,
} from "lucide-react";
import { departmentService } from "@/hrms/services/departmentService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { staffService } from "@/hrms/services/staffService";
import { toast } from "@/hrms/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/hrms/components/ui/dialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/hrms/components/ui/select";

const departmentSchema = z.object({
    name: z.string().min(2, "Department name must be at least 2 characters"),
    code: z.string().min(2, "Department code must be at least 2 characters"),
    description: z.string().optional(),
    managerId: z.string().optional(),
    isActive: z.boolean().default(true),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export default function DepartmentPage() {
    const confirm = useConfirm();
    const [departments, setDepartments] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<DepartmentFormValues>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: "",
            code: "",
            description: "",
            managerId: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (editingDept) {
            form.reset({
                name: editingDept.name,
                code: editingDept.code,
                description: editingDept.description || "",
                managerId: editingDept.managerId?._id || editingDept.managerId || "",
                isActive: editingDept.isActive ?? true,
            });
        } else {
            form.reset({
                name: "",
                code: "",
                description: "",
                managerId: "",
                isActive: true,
            });
        }
    }, [editingDept, isAddOpen]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [deptsData, usersData] = await Promise.all([
                departmentService.getAll(),
                staffService.getAll(),
            ]);
            setDepartments(deptsData);
            setManagers(usersData);
        } catch (error) {
            console.error("Failed to load departments", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDepartments = useMemo(() => {
        return departments.filter((d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [departments, searchQuery]);

    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: "Delete Department", description: "This department will be permanently deleted. This action cannot be undone.", variant: "danger" });
        if (!ok) return;
        try {
            await departmentService.delete(id);
            setDepartments(departments.filter((d) => d._id !== id));
            toast({
                title: "Department Deleted",
                description: "The department has been removed successfully.",
                variant: "destructive",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete department",
                variant: "destructive",
            });
        }
    };

    const onFormSubmit = async (values: DepartmentFormValues) => {
        setIsSubmitting(true);
        // strip placeholder sentinel before sending to backend.
        // Send null (not "") when no manager is chosen — an empty string is an
        // invalid ObjectId and triggers a Mongoose cast error on the backend.
        const payload = {
            ...values,
            managerId: !values.managerId || values.managerId === "__none__" ? null : values.managerId,
        };
        try {
            if (editingDept) {
                const updated = await departmentService.update(editingDept._id, payload);
                setDepartments(departments.map((d) => (d._id === editingDept._id ? updated : d)));
                toast({
                    title: "Department Updated",
                    description: `${updated.name} has been updated.`,
                });
            } else {
                const newDept = await departmentService.create(payload);
                setDepartments([...departments, newDept]);
                toast({
                    title: "Department Created",
                    description: `${newDept.name} has been added.`,
                });
            }
            setIsAddOpen(false);
            setEditingDept(null);
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
                    title="Departments"
                    subtitle="Manage organizational departments and assignments"
                />
                <Dialog
                    open={isAddOpen}
                    onOpenChange={(open) => {
                        setIsAddOpen(open);
                        if (!open) setEditingDept(null);
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Department
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-0 rounded-[2.5rem] max-w-lg shadow-2xl p-0 overflow-hidden flex flex-col">
                        <DialogHeader className="p-8 pb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 shrink-0 rounded-xl gradient-primary flex items-center justify-center text-white shadow-soft">
                                    <Building2 className="h-6 w-6 shrink-0" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-2xl font-bold truncate">
                                        {editingDept ? "Update Department" : "New Department"}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground font-medium">
                                        Manage department details and manager assignments.
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
                                                <FormLabel className="text-xs font-bold text-foreground/70">Dept Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Sales" {...field} className="h-12 rounded-xl" />
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
                                                <FormLabel className="text-xs font-bold text-foreground/70">Dept Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. SLS" {...field} className="h-12 rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="managerId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground/70">Department Manager</FormLabel>
                                            <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                                                <SelectTrigger className="h-12 rounded-xl">
                                                    <SelectValue placeholder="Select Manager" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">— No Manager —</SelectItem>
                                                    {managers.map((m) => {
                                                        const id = m._id || m.id;
                                                        if (!id) return null;
                                                        return (
                                                            <SelectItem key={id} value={id}>
                                                                {m.name}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-foreground/70">Description</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional details..." {...field} className="h-12 rounded-xl" />
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
                                        {editingDept ? "Save Changes" : "Create Department"}
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
                            <Building className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Department List</h2>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                                {filteredDepartments.length} Departments Active
                            </p>
                        </div>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                            placeholder="Search departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 rounded-xl border-gray-200 bg-white"
                        />
                    </div>
                </div>

                <DataTable
                    data={filteredDepartments}
                    isLoading={isLoading}
                    columns={[
                        {
                            header: "Dept Name",
                            accessorKey: (d) => (
                                <div className="font-bold text-foreground">{d.name}</div>
                            ),
                        },
                        {
                            header: "Dept Code",
                            accessorKey: (d) => (
                                <Badge variant="outline" className=" bg-gray-50 border-gray-200 text-gray-600 px-3 py-0.5 rounded-lg">
                                    {d.code}
                                </Badge>
                            ),
                        },
                        {
                            header: "Manager",
                            accessorKey: (d) => (
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-sm">
                                        {d.managerId?.name || "Unassigned"}
                                    </span>
                                </div>
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
                            header: "Actions",
                            accessorKey: (d) => (
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                                        onClick={() => { setEditingDept(d); setIsAddOpen(true); }}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(d._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
}
