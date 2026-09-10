import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";

// TEMPORARY debug-only page — not linked from any nav, used to reproduce a
// reported bug in a real browser without needing authenticated backend
// access. Delete this file and its route once the investigation is done.
export default function WaDebugPage() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>WA Debug</h1>
      <div data-testid="wa-widget">
        <WhatsAppQuickChat phone="9876543210" data={{ customer_name: "John Doe" }} />
      </div>
    </div>
  );
}
