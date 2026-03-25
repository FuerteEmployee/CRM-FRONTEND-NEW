import { SetupPageLayout } from "./SetupPageLayout";
export default function SetupEmailTemplates() {
  return (
    <SetupPageLayout
      title="Email Templates"
      description="Manage email templates sent to customers and staff."
      addLabel="Add Template"
      columns={[
        { key: "name", label: "Template Name" },
        { key: "subject", label: "Subject" },
      ]}
      rows={[
        { name: "Invoice Sent", subject: "Your Invoice #{number} from {company}" },
        { name: "Welcome Email", subject: "Welcome to {company}!" },
        { name: "Ticket Created", subject: "Ticket #{number} Created" },
        { name: "Payment Received", subject: "Payment Received - Thank You!" },
      ]}
    />
  );
}
