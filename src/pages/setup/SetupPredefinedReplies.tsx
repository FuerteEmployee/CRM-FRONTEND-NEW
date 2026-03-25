import { SetupPageLayout } from "./SetupPageLayout";
export default function SetupPredefinedReplies() {
  return (
    <SetupPageLayout
      title="Predefined Replies"
      description="Save frequently used responses for quick access."
      addLabel="Add Reply"
      columns={[
        { key: "name", label: "Reply Name" },
        { key: "message", label: "Message Preview" },
      ]}
      rows={[
        { name: "Thank You", message: "Thank you for contacting us..." },
        { name: "Ticket Received", message: "We have received your ticket..." },
      ]}
    />
  );
}
