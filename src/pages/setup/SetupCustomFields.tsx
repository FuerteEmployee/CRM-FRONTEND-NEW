import { SetupPageLayout } from "./SetupPageLayout";
export default function SetupCustomFields() {
  return (
    <SetupPageLayout
      title="Custom Fields"
      description="Add custom fields to extend your CRM data."
      addLabel="Add Field"
      columns={[
        { key: "name", label: "Field Name" },
        { key: "type", label: "Field Type" },
        { key: "belongs", label: "Belongs To" },
      ]}
      rows={[
        { name: "Industry", type: "Dropdown", belongs: "Customer" },
        { name: "Budget", type: "Number", belongs: "Lead" },
        { name: "Priority Notes", type: "Text", belongs: "Contract" },
      ]}
    />
  );
}
