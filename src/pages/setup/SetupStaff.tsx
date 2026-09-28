import React from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";

const STAFF_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "First Name", sample: "Jane", required: true, core: true },
  { key: "Last Name", sample: "Doe", required: true, core: true },
  { key: "Email", sample: "jane.doe@example.com", required: true, core: true },
  { key: "Phone Number", sample: "9876543210", core: true },
  { key: "Role", sample: "Manager", core: true },
  { key: "Departments", sample: "Sales, Support", core: true },
  { key: "Active", sample: "Yes", core: true },
  { key: "Password", sample: "", core: false },
  { key: "Skype", sample: "jane.doe", core: false },
  { key: "Facebook", sample: "", core: false },
  { key: "LinkedIn", sample: "", core: false },
  { key: "Default Language", sample: "", core: false },
  // Employment Details (matched to an existing HRMS Department/Designation/Branch
  // by name, per tenant — leave blank to skip, or set up the name first).
  { key: "HRMS Department", sample: "Operations", core: false },
  { key: "Designation", sample: "Team Lead", core: false },
  { key: "Branch", sample: "Head Office", core: false },
  { key: "Employment Type", sample: "permanent", core: false },
  { key: "Joining Date", sample: "01-04-2026", core: false },
  { key: "Attendance Required", sample: "Yes", core: false },
  { key: "Weekly Holidays", sample: "Sunday", core: false },
  // Salary & Banking
  { key: "Pay Type", sample: "Monthly", core: false },
  { key: "Salary Amount", sample: 25000, core: false },
  { key: "Bank Name", sample: "HDFC Bank", core: false },
  { key: "Account Number", sample: "123456789012", core: false },
  { key: "IFSC Code", sample: "HDFC0001234", core: false },
  // Identity & Personal
  { key: "Gender", sample: "Male", core: false },
  { key: "DOB", sample: "15-06-1995", core: false },
  { key: "Blood Group", sample: "O+", core: false },
  { key: "Education", sample: "B.Com", core: false },
  { key: "Experience", sample: "3 years", core: false },
  { key: "Address", sample: "12 MG Road, Bangalore", core: false },
  { key: "Emergency Contact Name", sample: "John Doe", core: false },
  { key: "Emergency Contact Phone", sample: "9876500000", core: false },
];

interface Role {
  _id: string;
  name: string;
}

interface StaffMember {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  role?: Role;
  active: boolean;
  last_login?: string;
}

export default function SetupStaff() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, isStaff } = usePermissions();
  const basePath = isStaff ? "/staff" : "/admin";

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await staffService.getAll();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      staffService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Success", description: "Staff member updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Success", description: "Staff member deleted" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: StaffMember[]) => {
      await Promise.all(items.map((item) => staffService.delete(item._id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Deleted", description: "Selected items deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: Record<string, any>[]) => staffService.import(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      toast({
        title: count === 0 ? "No New Staff Imported" : "Import Successful",
        description: data?.data?.message ?? data?.message ?? `Imported ${count} staff member(s).`,
        variant: count === 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Failed", description: error?.response?.data?.message || error.message, variant: "destructive" });
    },
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    const valid = rows.filter((r) => r["Email"] || r["email"]);
    if (!valid.length) {
      toast({ title: "No valid rows", description: "Rows need at least an Email column.", variant: "destructive" });
      return;
    }
    importMutation.mutate(valid);
  };

  const handleAdd = () => {
    navigate(`${basePath}/setup/staff/new`);
  };

  const handleEdit = (member: StaffMember) => {
    navigate(`${basePath}/setup/staff/${member._id}`);
  };

  const handleDelete = (member: StaffMember) => {
    if (window.confirm(`Delete ${member.firstname} ${member.lastname}?`)) {
      deleteMutation.mutate(member._id);
    }
  };

  return (
    <DataTablePage
      title="Staff"
      subtitle="Manage staff members and their access."
      addLabel="Add New Staff Member"
      headerActions={
        can("Staff", "Create") ? (
          <ImportDialog
            title="Import Staff"
            columns={STAFF_IMPORT_COLUMNS}
            onData={handleImportData}
            loading={importMutation.isPending}
            triggerLabel="Import"
            mappingNote="Your spreadsheet's columns (First Name, Last Name, Email, Role, Employment Details, Salary & Banking, and Identity fields) will be automatically detected and mapped to staff records. Photo, Legal Documents, Permissions and Assigned Customers must still be set per staff member after import."
            templateFilename="sample_staff_import.xlsx"
            sheetName="Staff"
          />
        ) : undefined
      }
      onAdd={can("Staff", "Create") ? handleAdd : undefined}
      onEdit={can("Staff", "Edit") ? handleEdit : undefined}
      onDelete={can("Staff", "Delete") ? handleDelete : undefined}
      enableBulkActions={true}
      onBulkDelete={(items) => bulkDeleteMutation.mutate(items as StaffMember[])}
      columns={[
        {
          key: "name",
          label: "Full Name",
          render: (member: StaffMember) => (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border">
                <AvatarImage src="" />
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                  {member.firstname?.[0] || ""}
                  {member.lastname?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  {member.firstname} {member.lastname}
                </span>
                <span className="text-xs text-muted-foreground">{member.email}</span>
              </div>
            </div>
          ),
        },
        {
          key: "email",
          label: "Email",
          className: "text-foreground font-medium",
        },
        {
          key: "role",
          label: "Role",
          className: "text-center",
          render: (member: StaffMember) => (
            <span className="text-foreground font-medium">
              {member.role?.name ||
                (typeof member.role === "string" ? member.role : "No Role")}
            </span>
          ),
        },
        {
          key: "last_login",
          label: "Last Login",
          className: "text-center",
          render: (member: StaffMember) => (
            <span className="text-muted-foreground text-sm">
              {member.last_login
                ? formatDistanceToNow(new Date(member.last_login), {
                    addSuffix: true,
                  })
                : "Never"}
            </span>
          ),
        },
        {
          key: "active",
          label: "Active",
          render: (member: StaffMember) => (
            <Switch
              checked={member.active}
              onCheckedChange={(checked) => {
                updateMutation.mutate({
                  id: member._id,
                  data: { active: checked },
                });
              }}
              disabled={!can("Staff", "Edit")}
              className="data-[state=checked]:bg-primary"
            />
          ),
        },
      ]}
      data={staff}
      isLoading={isLoadingStaff}
      idField="_id"
      showIdColumn={false}
    />
  );
}
