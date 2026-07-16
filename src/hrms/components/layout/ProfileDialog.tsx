import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/hrms/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/hrms/components/ui/form";
import { Input } from "@/hrms/components/ui/input";
import { Button } from "@/hrms/components/ui/button";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { staffService } from "@/hrms/services/staffService";
import { toast } from "@/hrms/hooks/use-toast";
import { Mail, Phone, Shield, Building2, UserCircle, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/hrms/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/hrms/components/ui/select";
import { Badge } from "@/hrms/components/ui/badge";
import { Separator } from "@/hrms/components/ui/separator";
import { Textarea } from "@/hrms/components/ui/textarea";

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
    gender: z.string().optional(),
    dob: z.string().optional(),
    bloodGroup: z.string().optional(),
    residentialPhone: z.string().optional(),
    address: z
        .object({
            current: z.string().optional(),
            permanent: z.string().optional(),
        })
        .optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ isOpen, onOpenChange }: ProfileDialogProps) {
    const { user, refreshUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            mobile: user?.mobile || "",
            gender: user?.gender || "",
            dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
            bloodGroup: user?.bloodGroup || "",
            residentialPhone: user?.residentialPhone || "",
            address: {
                current: user?.address?.current || "",
                permanent: user?.address?.permanent || "",
            },
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name,
                email: user.email,
                mobile: user.mobile || "",
                gender: user.gender || "",
                dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
                bloodGroup: user.bloodGroup || "",
                residentialPhone: user.residentialPhone || "",
                address: {
                    current: user.address?.current || "",
                    permanent: user.address?.permanent || "",
                },
            });
            setAvatarPreview(user.avatar || null);
        }
    }, [user, form]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (values: ProfileFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", values.name);
            formData.append("email", values.email);
            formData.append("mobile", values.mobile);
            formData.append("gender", values.gender || "");
            formData.append("dob", values.dob || "");
            formData.append("bloodGroup", values.bloodGroup || "");
            formData.append("residentialPhone", values.residentialPhone || "");
            formData.append("address.current", values.address?.current || "");
            formData.append("address.permanent", values.address?.permanent || "");
            if (avatarFile) formData.append("avatar", avatarFile);

            await staffService.update(user.id, formData as any);
            await refreshUser();
            setAvatarFile(null);
            toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.response?.data?.message || "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {/*
             * KEY FIX: Single scrollable column.
             * - No nested ScrollArea inside overflow-y-auto (that caused double-scroll).
             * - DialogContent uses flex-col + overflow-hidden so the inner div can scroll.
             * - The header (banner + avatar) is `shrink-0` so it never scrolls away.
             * - The form area gets `flex-1 overflow-y-auto` — ONE scroll container total.
             * - Footer is sticky inside that scroll container via `sticky bottom-0`.
             */}
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 rounded-[2rem] border-0 glass-deep overflow-hidden flex flex-col max-h-[90vh]">

                {/* ── Banner + Avatar (fixed, never scrolls) ── */}
                <div className="relative h-28 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent shrink-0">
                    <div className="absolute -bottom-10 left-8">
                        <div className="relative group cursor-pointer">
                            <Avatar className="h-20 w-20 border-4 border-background shadow-xl rounded-[1.25rem] overflow-hidden">
                                <AvatarImage src={avatarPreview || undefined} className="object-cover" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xl font-black rounded-[1.25rem]">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[1.25rem]">
                                <Camera className="text-white h-4 w-4" />
                                <span className="text-white text-[8px] font-bold">CHANGE</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                        </div>
                    </div>

                    {/* Role + Department chips top-right */}
                    <div className="absolute top-3 right-4 flex gap-2">
                        <Badge variant="outline" className="rounded-full bg-black/20 border-white/20 text-white/80 font-bold px-2.5 py-0.5 text-[9px] backdrop-blur-sm">
                            <Shield className="h-2.5 w-2.5 mr-1" />
                            {(user?.role && typeof user.role === "object")
                                ? user.role.label
                                : ((user?.role as string) || "").replace("_", " ") || "Staff"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-black/20 border-white/20 text-white/80 font-bold px-2.5 py-0.5 text-[9px] backdrop-blur-sm">
                            <Building2 className="h-2.5 w-2.5 mr-1" />
                            {user?.department?.name || "General HQ"}
                        </Badge>
                    </div>
                </div>

                {/* ── Single scrollable content area ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="pt-14 px-8 pb-4">
                        {/* Header */}
                        <DialogHeader className="mb-5 space-y-0.5">
                            <DialogTitle className="text-2xl font-black tracking-tight">Profile Details</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground font-medium">
                                Manage your personal information and contact details.
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* ── Section: Primary Info ── */}
                                <div className="space-y-3">
                                    <SectionLabel>Primary Info</SectionLabel>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="field-label">Full Name</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
                                                        <Input {...field} className="h-10 pl-9 rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold text-sm" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-[9px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Email</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                                                            <Input {...field} disabled className="h-10 pl-9 rounded-xl bg-black/5 border-0 cursor-not-allowed opacity-60 font-semibold text-sm" />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="mobile"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Mobile</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
                                                            <Input {...field} className="h-10 pl-9 rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold text-sm" />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-white/10" />

                                {/* ── Section: Bio Data ── */}
                                <div className="space-y-3">
                                    <SectionLabel>Bio Data</SectionLabel>
                                    <div className="grid grid-cols-3 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="dob"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Date of Birth</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} className="h-10 rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold text-xs" />
                                                    </FormControl>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="gender"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Gender</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 rounded-xl bg-white/50 border-0 focus:ring-primary/20 font-bold text-xs">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="rounded-xl border-0 glass-deep">
                                                            {["Male", "Female", "Other"].map((g) => (
                                                                <SelectItem key={g} value={g} className="font-bold text-xs">{g}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bloodGroup"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Blood Group</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 rounded-xl bg-white/50 border-0 focus:ring-primary/20 font-bold text-xs">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="rounded-xl border-0 glass-deep">
                                                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                                                <SelectItem key={bg} value={bg} className="font-bold text-xs">{bg}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-white/10" />

                                {/* ── Section: Contact & Address ── */}
                                <div className="space-y-3">
                                    <SectionLabel>Contact & Address</SectionLabel>
                                    <FormField
                                        control={form.control}
                                        name="residentialPhone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="field-label">Residential Phone</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Home telephone number" className="h-10 rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[9px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="address.current"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Current Address</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...field} placeholder="City, State, Country" className="min-h-[90px] rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold resize-none text-xs" />
                                                    </FormControl>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.permanent"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="field-label">Permanent Address</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...field} placeholder="Permanent residence details" className="min-h-[90px] rounded-xl bg-white/50 border-0 focus-visible:ring-primary/20 font-bold resize-none text-xs" />
                                                    </FormControl>
                                                    <FormMessage className="text-[9px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* ── Submit Button (inside scroll, at bottom of form) ── */}
                                <div className="pb-8 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 rounded-2xl gradient-primary font-black text-xs uppercase tracking-widest shadow-glow text-white border-0 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            "Update Profile"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ── Small helper for section headers ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50 pl-0.5">
            {children}
        </p>
    );
}