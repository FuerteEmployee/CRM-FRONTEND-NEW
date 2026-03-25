import { SetupPageLayout } from "./SetupPageLayout";
export default function SetupStaff() {
  return (
    <SetupPageLayout
      title="Staff"
      description="Manage staff members and their access."
      addLabel="Add Staff"
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
      ]}
      rows={[
        { name: "John Smith", email: "john@example.com", role: "Admin" },
        { name: "Sarah Johnson", email: "sarah@example.com", role: "Staff" },
      ]}
    />
  );
}
