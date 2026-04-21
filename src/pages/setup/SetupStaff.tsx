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
  const { can } = usePermissions();

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<
    StaffMember[]
  >({
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

  const handleAdd = () => {
    navigate("/admin/setup/staff/new");
  };

  const handleEdit = (member: StaffMember) => {
    navigate(`/admin/setup/staff/${member._id}`);
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
      onAdd={can("Staff", "Create") ? handleAdd : undefined}
      onEdit={can("Staff", "Edit") ? handleEdit : undefined}
      onDelete={can("Staff", "Delete") ? handleDelete : undefined}
      columns={[
        {
          key: "name",
          label: "Full Name",
          render: (member: StaffMember) => (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border">
                <AvatarImage src="" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {member.firstname[0]}
                  {member.lastname[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground">
                {member.firstname} {member.lastname}
              </span>
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
                (typeof member.role === "string" ? member.role : "")}
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
