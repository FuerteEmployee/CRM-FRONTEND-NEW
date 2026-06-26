// Demo / seed data — returned as fallback when the API is unreachable or returns empty.
// Keys match the API endpoint path (without query strings).

export const DEMO_DATA = {

  // ─── Customers / Clients ─────────────────────────────────────────────────
  "/clients": [
    { _id: "c001", company: "Acme Corp", firstname: "James", lastname: "Anderson", email: "james@acmecorp.com", phone: "+1 555-0101", active: true, groups: [{ _id: "g1", name: "Premium" }], created_at: "2024-01-10T09:00:00Z" },
    { _id: "c002", company: "TechStart Inc", firstname: "Sarah", lastname: "Mitchell", email: "sarah@techstart.io", phone: "+1 555-0202", active: true, groups: [{ _id: "g2", name: "Startup" }], created_at: "2024-01-18T10:30:00Z" },
    { _id: "c003", company: "GlobalTrade Ltd", firstname: "Robert", lastname: "Chen", email: "r.chen@globaltrade.com", phone: "+44 20 7946 0301", active: true, groups: [{ _id: "g1", name: "Premium" }], created_at: "2024-02-05T08:00:00Z" },
    { _id: "c004", company: "Nexus Solutions", firstname: "Emily", lastname: "Parker", email: "emily@nexussol.com", phone: "+1 555-0404", active: false, groups: [], created_at: "2024-02-14T11:00:00Z" },
    { _id: "c005", company: "BrightPath Agency", firstname: "Daniel", lastname: "Kumar", email: "d.kumar@brightpath.co", phone: "+91 98765 43210", active: true, groups: [{ _id: "g3", name: "Agency" }], created_at: "2024-03-01T09:30:00Z" },
    { _id: "c006", company: "Vertex Digital", firstname: "Olivia", lastname: "Torres", email: "olivia@vertexdigital.com", phone: "+1 555-0606", active: true, groups: [{ _id: "g2", name: "Startup" }], created_at: "2024-03-12T14:00:00Z" },
    { _id: "c007", company: "Summit Retail", firstname: "William", lastname: "Nguyen", email: "will@summitretail.net", phone: "+1 555-0707", active: true, groups: [{ _id: "g1", name: "Premium" }], created_at: "2024-04-02T10:00:00Z" },
  ],

  // ─── Client Groups ────────────────────────────────────────────────────────
  "/client-groups": [
    { _id: "g1", name: "Premium", description: "High-value enterprise clients" },
    { _id: "g2", name: "Startup", description: "Early-stage startup companies" },
    { _id: "g3", name: "Agency", description: "Digital and marketing agencies" },
    { _id: "g4", name: "SMB", description: "Small and medium businesses" },
  ],

  // ─── Leads ───────────────────────────────────────────────────────────────
  "/leads": [
    { _id: "l001", name: "Alice Foster", company: "Bloom Ventures", email: "alice@bloomventures.com", phone: "+1 555-1001", value: 8500, tags: ["hot", "follow-up"], assigned: { _id: "s001", firstname: "Mike", lastname: "Brown" }, status: { _id: "ls1", name: "Hot", color: "#ef4444" }, source: { _id: "src1", name: "Website" }, last_contact: "2024-05-20T10:00:00Z", created_at: "2024-05-01T09:00:00Z" },
    { _id: "l002", name: "Tom Harrison", company: "Apex Media", email: "tom@apexmedia.io", phone: "+1 555-1002", value: 3200, tags: ["warm"], assigned: { _id: "s002", firstname: "Alice", lastname: "Cooper" }, status: { _id: "ls2", name: "Warm", color: "#f97316" }, source: { _id: "src2", name: "Referral" }, last_contact: "2024-05-18T14:00:00Z", created_at: "2024-05-05T10:30:00Z" },
    { _id: "l003", name: "Priya Shah", company: "Greenline Foods", email: "priya@greenline.com", phone: "+91 99887 65432", value: 12000, tags: ["enterprise", "hot"], assigned: { _id: "s001", firstname: "Mike", lastname: "Brown" }, status: { _id: "ls1", name: "Hot", color: "#ef4444" }, source: { _id: "src3", name: "Cold Call" }, last_contact: "2024-05-22T09:00:00Z", created_at: "2024-05-08T08:00:00Z" },
    { _id: "l004", name: "Carlos Ruiz", company: "Monterey Builders", email: "carlos@monterey.co", phone: "+1 555-1004", value: 5000, tags: ["cold"], assigned: null, status: { _id: "ls3", name: "Cold", color: "#60a5fa" }, source: { _id: "src1", name: "Website" }, last_contact: "2024-05-10T11:00:00Z", created_at: "2024-05-12T09:00:00Z" },
    { _id: "l005", name: "Jessica Lang", company: "Sunrise Health", email: "j.lang@sunrisehealth.org", phone: "+1 555-1005", value: 21000, tags: ["hot", "enterprise", "priority"], assigned: { _id: "s002", firstname: "Alice", lastname: "Cooper" }, status: { _id: "ls4", name: "Meeting", color: "#8b5cf6" }, source: { _id: "src4", name: "LinkedIn" }, last_contact: "2024-05-23T15:00:00Z", created_at: "2024-05-15T10:00:00Z" },
    { _id: "l006", name: "David Kim", company: "Orbit Analytics", email: "david@orbitanalytics.com", phone: "+82 10 1234 5678", value: 6800, tags: ["warm", "demo-scheduled"], assigned: { _id: "s003", firstname: "Rachel", lastname: "Green" }, status: { _id: "ls2", name: "Warm", color: "#f97316" }, source: { _id: "src2", name: "Referral" }, last_contact: "2024-05-19T10:00:00Z", created_at: "2024-05-17T08:30:00Z" },
  ],

  // ─── Lead Sources ─────────────────────────────────────────────────────────
  "/lead-sources": [
    { _id: "src1", name: "Website", description: "Organic website contact form" },
    { _id: "src2", name: "Referral", description: "Referred by existing client" },
    { _id: "src3", name: "Cold Call", description: "Outbound cold call campaign" },
    { _id: "src4", name: "LinkedIn", description: "LinkedIn outreach" },
    { _id: "src5", name: "Trade Show", description: "Industry trade show event" },
    { _id: "src6", name: "Google Ads", description: "Paid search advertising" },
  ],

  // ─── Lead Statuses ────────────────────────────────────────────────────────
  "/lead-statuses": [
    { _id: "ls1", name: "Hot", color: "#ef4444", order: 1 },
    { _id: "ls2", name: "Warm", color: "#f97316", order: 2 },
    { _id: "ls3", name: "Cold", color: "#60a5fa", order: 3 },
    { _id: "ls4", name: "Meeting", color: "#8b5cf6", order: 4 },
    { _id: "ls5", name: "Requirement", color: "#10b981", order: 5 },
    { _id: "ls6", name: "Pending", color: "#6b7280", order: 6 },
    { _id: "ls7", name: "Lost", color: "#111827", order: 7 },
  ],

  // ─── Tasks ───────────────────────────────────────────────────────────────
  "/tasks": [
    { _id: "t001", name: "Design homepage mockup", status: 2, start_date: "2024-05-01", due_date: "2024-05-15", assignees: [{ _id: "s002", firstname: "Alice", lastname: "Cooper" }], tags: ["design", "priority"], priority: "High", billable: true, project: { _id: "p001", name: "Website Redesign" } },
    { _id: "t002", name: "Set up CI/CD pipeline", status: 1, start_date: "2024-05-05", due_date: "2024-05-20", assignees: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }], tags: ["devops"], priority: "Medium", billable: false, project: null },
    { _id: "t003", name: "Write API documentation", status: 3, start_date: "2024-04-20", due_date: "2024-05-10", assignees: [{ _id: "s003", firstname: "Rachel", lastname: "Green" }], tags: ["docs"], priority: "Low", billable: true, project: { _id: "p002", name: "CRM Integration" } },
    { _id: "t004", name: "User acceptance testing - billing module", status: 4, start_date: "2024-05-10", due_date: "2024-05-25", assignees: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s002", firstname: "Alice", lastname: "Cooper" }], tags: ["testing", "billing"], priority: "High", billable: true, project: { _id: "p001", name: "Website Redesign" } },
    { _id: "t005", name: "Quarterly performance review", status: 5, start_date: "2024-04-01", due_date: "2024-04-30", assignees: [{ _id: "s004", firstname: "John", lastname: "Davis" }], tags: ["hr", "internal"], priority: "Medium", billable: false, project: null },
    { _id: "t006", name: "Migrate legacy database to PostgreSQL", status: 2, start_date: "2024-05-12", due_date: "2024-06-12", assignees: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }], tags: ["database", "migration", "priority"], priority: "High", billable: true, project: { _id: "p003", name: "Infrastructure Upgrade" } },
    { _id: "t007", name: "Create social media content calendar", status: 1, start_date: "2024-05-15", due_date: "2024-05-31", assignees: [{ _id: "s003", firstname: "Rachel", lastname: "Green" }], tags: ["marketing"], priority: "Low", billable: false, project: null },
  ],

  // ─── Todos (internal tasks) ───────────────────────────────────────────────
  "/todos": [
    { _id: "td001", name: "Review client proposals", status: 1, due_date: "2024-05-25", priority: "High", isTodo: true },
    { _id: "td002", name: "Prepare monthly report", status: 2, due_date: "2024-05-30", priority: "Medium", isTodo: true },
    { _id: "td003", name: "Update CRM settings", status: 1, due_date: "2024-05-28", priority: "Low", isTodo: true },
  ],

  // ─── Projects ────────────────────────────────────────────────────────────
  "/projects": [
    { _id: "p001", name: "Website Redesign", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", tags: ["web", "design"], start_date: "2024-03-01", deadline: "2024-06-30", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s002", firstname: "Alice", lastname: "Cooper" }], status: 2, progress: 55 },
    { _id: "p002", name: "CRM Integration", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", tags: ["integration", "api"], start_date: "2024-02-15", deadline: "2024-05-31", members: [{ _id: "s003", firstname: "Rachel", lastname: "Green" }], status: 3, progress: 80 },
    { _id: "p003", name: "Infrastructure Upgrade", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", tags: ["devops", "cloud"], start_date: "2024-04-01", deadline: "2024-07-31", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s004", firstname: "John", lastname: "Davis" }], status: 2, progress: 30 },
    { _id: "p004", name: "Mobile App Development", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", tags: ["mobile", "react-native"], start_date: "2024-01-15", deadline: "2024-04-30", members: [{ _id: "s002", firstname: "Alice", lastname: "Cooper" }], status: 5, progress: 100 },
    { _id: "p005", name: "E-commerce Platform", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", tags: ["ecommerce", "web"], start_date: "2024-05-01", deadline: "2024-09-30", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s003", firstname: "Rachel", lastname: "Green" }], status: 1, progress: 10 },
  ],

  // ─── Invoices ─────────────────────────────────────────────────────────────
  "/invoices": [
    { _id: "inv001", number: "INV-2024-001", invoice_number: "INV-2024-001", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", date: "2024-03-01", due_date: "2024-03-31", total: 12500, total_tax: 1125, status: "Paid" },
    { _id: "inv002", number: "INV-2024-002", invoice_number: "INV-2024-002", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", date: "2024-03-15", due_date: "2024-04-15", total: 4800, total_tax: 432, status: "Unpaid" },
    { _id: "inv003", number: "INV-2024-003", invoice_number: "INV-2024-003", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", date: "2024-04-01", due_date: "2024-04-30", total: 23000, total_tax: 2070, status: "Partially Paid" },
    { _id: "inv004", number: "INV-2024-004", invoice_number: "INV-2024-004", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", date: "2024-02-15", due_date: "2024-03-15", total: 7200, total_tax: 648, status: "Overdue" },
    { _id: "inv005", number: "INV-2024-005", invoice_number: "INV-2024-005", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", date: "2024-05-01", due_date: "2024-05-31", total: 9600, total_tax: 864, status: "Draft" },
    { _id: "inv006", number: "INV-2024-006", invoice_number: "INV-2024-006", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", date: "2024-05-10", due_date: "2024-06-10", total: 5400, total_tax: 486, status: "Unpaid" },
    { _id: "inv007", number: "INV-2024-007", invoice_number: "INV-2024-007", customer: { _id: "c006", company: "Vertex Digital" }, customer_name: "Vertex Digital", date: "2024-01-20", due_date: "2024-02-20", total: 3100, total_tax: 279, status: "Cancelled" },
  ],

  // ─── Payments ─────────────────────────────────────────────────────────────
  "/payments": [
    { _id: "pay001", invoice_number: "INV-2024-001", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", payment_mode: "Bank Transfer", transaction_id: "TXN-BNK-00112", amount: 12500, date: "2024-03-28" },
    { _id: "pay002", invoice_number: "INV-2024-003", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", payment_mode: "UPI", transaction_id: "UPI-2024-88721", amount: 10000, date: "2024-04-20" },
    { _id: "pay003", invoice_number: "INV-2024-004", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", payment_mode: "Bank Transfer", transaction_id: "TXN-BNK-00245", amount: 3600, date: "2024-03-10" },
    { _id: "pay004", invoice_number: "INV-2024-001", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", payment_mode: "UPI", transaction_id: "UPI-2024-99012", amount: 2000, date: "2024-03-05" },
    { _id: "pay005", invoice_number: "INV-2024-002", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", payment_mode: "Bank Transfer", transaction_id: "TXN-BNK-00378", amount: 4800, date: "2024-04-10" },
  ],

  // ─── Expenses ─────────────────────────────────────────────────────────────
  "/expenses": [
    { _id: "exp001", category: { _id: "ec1", name: "Travel" }, amount: 850, name: "Client Site Visit - Acme Corp", date: "2024-04-15", billable: true, status: "Billed", payment_mode: "Credit Card", reference: "EXP-001", client: { company: "Acme Corp" }, tax: 0, note: "Return flight + hotel" },
    { _id: "exp002", category: { _id: "ec2", name: "Software" }, amount: 299, name: "Adobe CC Monthly License", date: "2024-05-01", billable: false, status: "Non-Billable", payment_mode: "Bank Transfer", reference: "EXP-002", client: null, tax: 53.82, note: "Team design tools" },
    { _id: "exp003", category: { _id: "ec3", name: "Marketing" }, amount: 1500, name: "Google Ads Campaign - Q2", date: "2024-04-01", billable: true, status: "Unbilled", payment_mode: "Credit Card", reference: "EXP-003", client: { company: "TechStart Inc" }, tax: 270, note: "Paid search campaign" },
    { _id: "exp004", category: { _id: "ec1", name: "Travel" }, amount: 320, name: "Conference Registration - DevFest", date: "2024-03-20", billable: false, status: "Non-Billable", payment_mode: "UPI", reference: "EXP-004", client: null, tax: 0, note: "Annual developer conference" },
    { _id: "exp005", category: { _id: "ec4", name: "Equipment" }, amount: 2400, name: "MacBook Pro for Design Team", date: "2024-02-10", billable: false, status: "Non-Billable", payment_mode: "Bank Transfer", reference: "EXP-005", client: null, tax: 432, note: "Hardware purchase" },
    { _id: "exp006", category: { _id: "ec3", name: "Marketing" }, amount: 650, name: "Social Media Ads - Summit Retail", date: "2024-05-10", billable: true, status: "Billable", payment_mode: "Credit Card", reference: "EXP-006", client: { company: "Summit Retail" }, tax: 117, note: "Facebook + Instagram ads" },
  ],

  // ─── Estimates ────────────────────────────────────────────────────────────
  "/estimates": [
    { _id: "est001", number: "EST-2024-001", estimate_number: "EST-2024-001", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", date: "2024-02-10", expiry_date: "2024-03-10", total: 18500, status: "Accepted" },
    { _id: "est002", number: "EST-2024-002", estimate_number: "EST-2024-002", customer: { _id: "c004", company: "Nexus Solutions" }, customer_name: "Nexus Solutions", date: "2024-03-05", expiry_date: "2024-04-05", total: 6200, status: "Sent" },
    { _id: "est003", number: "EST-2024-003", estimate_number: "EST-2024-003", customer: { _id: "c006", company: "Vertex Digital" }, customer_name: "Vertex Digital", date: "2024-03-20", expiry_date: "2024-04-20", total: 11400, status: "Draft" },
    { _id: "est004", number: "EST-2024-004", estimate_number: "EST-2024-004", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", date: "2024-04-01", expiry_date: "2024-05-01", total: 3800, status: "Declined" },
    { _id: "est005", number: "EST-2024-005", estimate_number: "EST-2024-005", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", date: "2024-05-05", expiry_date: "2024-06-05", total: 24000, status: "Sent" },
    { _id: "est006", number: "EST-2024-006", estimate_number: "EST-2024-006", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", date: "2024-01-15", expiry_date: "2024-02-15", total: 9900, status: "Expired" },
  ],

  // ─── Estimate Statuses ────────────────────────────────────────────────────
  "/estimate-statuses": [
    { _id: "es1", name: "Draft", color: "#6b7280" },
    { _id: "es2", name: "Sent", color: "#3b82f6" },
    { _id: "es3", name: "Accepted", color: "#10b981" },
    { _id: "es4", name: "Declined", color: "#ef4444" },
    { _id: "es5", name: "Expired", color: "#f97316" },
  ],

  // ─── Proposals ────────────────────────────────────────────────────────────
  "/proposals": [
    { _id: "prop001", number: "PROP-2024-001", proposal_number: "PROP-2024-001", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", subject: "Digital Transformation Roadmap", date: "2024-03-01", open_till: "2024-04-30", total: 35000, status: "Sent" },
    { _id: "prop002", number: "PROP-2024-002", proposal_number: "PROP-2024-002", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", subject: "Supply Chain Analytics Platform", date: "2024-03-15", open_till: "2024-05-15", total: 78000, status: "Accepted" },
    { _id: "prop003", number: "PROP-2024-003", proposal_number: "PROP-2024-003", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", subject: "Brand Identity & Website Package", date: "2024-04-05", open_till: "2024-05-05", total: 14500, status: "Open" },
    { _id: "prop004", number: "PROP-2024-004", proposal_number: "PROP-2024-004", customer: { _id: "c004", company: "Nexus Solutions" }, customer_name: "Nexus Solutions", subject: "ERP Implementation Services", date: "2024-02-20", open_till: "2024-03-20", total: 52000, status: "Declined" },
    { _id: "prop005", number: "PROP-2024-005", proposal_number: "PROP-2024-005", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", subject: "E-commerce Platform Development", date: "2024-05-01", open_till: "2024-06-30", total: 42000, status: "Revised" },
  ],

  // ─── Credit Notes ─────────────────────────────────────────────────────────
  "/credit-notes": [
    { _id: "cn001", number: "CN-2024-001", credit_note_number: "CN-2024-001", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", date: "2024-04-05", total: 1250, status: "Open" },
    { _id: "cn002", number: "CN-2024-002", credit_note_number: "CN-2024-002", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", date: "2024-03-22", total: 3400, status: "Closed" },
    { _id: "cn003", number: "CN-2024-003", credit_note_number: "CN-2024-003", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", date: "2024-02-28", total: 800, status: "Open" },
    { _id: "cn004", number: "CN-2024-004", credit_note_number: "CN-2024-004", customer: { _id: "c006", company: "Vertex Digital" }, customer_name: "Vertex Digital", date: "2024-01-30", total: 620, status: "Void" },
  ],

  // ─── Items (Products/Services) ────────────────────────────────────────────
  "/items": [
    { _id: "item001", description: "Web Development", long_description: "Full-stack web application development including frontend and backend", rate: 150, unit: "hour", group: "Development", tax: { _id: "tax1", name: "GST 18%", rate: 18 } },
    { _id: "item002", description: "UI/UX Design", long_description: "User interface and experience design services", rate: 120, unit: "hour", group: "Design", tax: { _id: "tax1", name: "GST 18%", rate: 18 } },
    { _id: "item003", description: "SEO Optimization", long_description: "Search engine optimization and content strategy", rate: 2500, unit: "month", group: "Marketing", tax: { _id: "tax2", name: "GST 5%", rate: 5 } },
    { _id: "item004", description: "Cloud Hosting (Annual)", long_description: "Managed cloud infrastructure on AWS/GCP with 99.9% uptime SLA", rate: 4800, unit: "year", group: "Hosting", tax: null },
    { _id: "item005", description: "Mobile App Development", long_description: "iOS and Android native or cross-platform app development", rate: 180, unit: "hour", group: "Development", tax: { _id: "tax1", name: "GST 18%", rate: 18 } },
    { _id: "item006", description: "Technical Support", long_description: "Ongoing technical support and maintenance", rate: 80, unit: "hour", group: "Support", tax: { _id: "tax2", name: "GST 5%", rate: 5 } },
    { _id: "item007", description: "Content Writing", long_description: "Blog posts, copywriting, and marketing content creation", rate: 60, unit: "hour", group: "Marketing", tax: null },
  ],

  // ─── Contracts ────────────────────────────────────────────────────────────
  "/contracts": [
    { _id: "con001", subject: "Annual Maintenance & Support Agreement", client: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", contract_type: { _id: "ct1", name: "Service Agreement" }, contract_value: 24000, datestart: "2024-01-01", dateend: "2024-12-31", status: "Active", created_at: "2024-01-01T09:00:00Z" },
    { _id: "con002", subject: "CRM Integration Project Contract", client: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", contract_type: { _id: "ct2", name: "Project Contract" }, contract_value: 52000, datestart: "2024-02-15", dateend: "2024-07-31", status: "Active", created_at: "2024-02-15T10:00:00Z" },
    { _id: "con003", subject: "Brand Identity Design Contract", client: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", contract_type: { _id: "ct3", name: "Fixed Price" }, contract_value: 14500, datestart: "2024-03-01", dateend: "2024-05-31", status: "Signed", created_at: "2024-03-01T09:00:00Z" },
    { _id: "con004", subject: "Website Development Agreement", client: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", contract_type: { _id: "ct2", name: "Project Contract" }, contract_value: 42000, datestart: "2024-05-01", dateend: "2024-09-30", status: "Draft", created_at: "2024-05-01T10:00:00Z" },
    { _id: "con005", subject: "Software License Agreement 2023", client: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", contract_type: { _id: "ct4", name: "License Agreement" }, contract_value: 18000, datestart: "2023-01-01", dateend: "2023-12-31", status: "Expired", created_at: "2023-01-01T09:00:00Z" },
  ],

  // ─── Contract Types ───────────────────────────────────────────────────────
  "/contract-types": [
    { _id: "ct1", name: "Service Agreement", description: "Ongoing service and maintenance contract" },
    { _id: "ct2", name: "Project Contract", description: "Fixed-scope project delivery contract" },
    { _id: "ct3", name: "Fixed Price", description: "Fixed price deliverable contract" },
    { _id: "ct4", name: "License Agreement", description: "Software or IP license agreement" },
    { _id: "ct5", name: "NDA", description: "Non-disclosure agreement" },
  ],

  // ─── Support Tickets ──────────────────────────────────────────────────────
  "/tickets": [
    { _id: "tk001", ticket_number: "TKT-001", subject: "Cannot login to client portal", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", department: { _id: "dept1", name: "Technical Support" }, priority: { _id: "pr1", name: "High", color: "#ef4444" }, status: { _id: "ts1", name: "Open", color: "#3b82f6" }, created_at: "2024-05-20T10:00:00Z", updated_at: "2024-05-20T10:00:00Z" },
    { _id: "tk002", ticket_number: "TKT-002", subject: "Invoice PDF not generating", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", department: { _id: "dept1", name: "Technical Support" }, priority: { _id: "pr2", name: "Medium", color: "#f97316" }, status: { _id: "ts2", name: "In Progress", color: "#8b5cf6" }, created_at: "2024-05-19T14:00:00Z", updated_at: "2024-05-21T09:00:00Z" },
    { _id: "tk003", ticket_number: "TKT-003", subject: "Request for additional user accounts", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", department: { _id: "dept2", name: "Account Management" }, priority: { _id: "pr3", name: "Low", color: "#10b981" }, status: { _id: "ts3", name: "Answered", color: "#10b981" }, created_at: "2024-05-15T11:00:00Z", updated_at: "2024-05-17T16:00:00Z" },
    { _id: "tk004", ticket_number: "TKT-004", subject: "Bulk import failing for large CSV files", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", department: { _id: "dept1", name: "Technical Support" }, priority: { _id: "pr1", name: "High", color: "#ef4444" }, status: { _id: "ts4", name: "On Hold", color: "#6b7280" }, created_at: "2024-05-18T09:00:00Z", updated_at: "2024-05-22T11:00:00Z" },
    { _id: "tk005", ticket_number: "TKT-005", subject: "Feature request: Dark mode for reports", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", department: { _id: "dept3", name: "Product" }, priority: { _id: "pr3", name: "Low", color: "#10b981" }, status: { _id: "ts5", name: "Closed", color: "#111827" }, created_at: "2024-05-10T13:00:00Z", updated_at: "2024-05-14T10:00:00Z" },
  ],

  // ─── Ticket Statuses ──────────────────────────────────────────────────────
  "/ticket-statuses": [
    { _id: "ts1", name: "Open", color: "#3b82f6", order: 1 },
    { _id: "ts2", name: "In Progress", color: "#8b5cf6", order: 2 },
    { _id: "ts3", name: "Answered", color: "#10b981", order: 3 },
    { _id: "ts4", name: "On Hold", color: "#6b7280", order: 4 },
    { _id: "ts5", name: "Closed", color: "#111827", order: 5 },
  ],

  // ─── Priorities ───────────────────────────────────────────────────────────
  "/priorities": [
    { _id: "pr1", name: "High", color: "#ef4444" },
    { _id: "pr2", name: "Medium", color: "#f97316" },
    { _id: "pr3", name: "Low", color: "#10b981" },
    { _id: "pr4", name: "Critical", color: "#7c3aed" },
  ],

  // ─── Departments ──────────────────────────────────────────────────────────
  "/departments": [
    { _id: "dept1", name: "Technical Support", email: "tech@company.com" },
    { _id: "dept2", name: "Account Management", email: "accounts@company.com" },
    { _id: "dept3", name: "Product", email: "product@company.com" },
    { _id: "dept4", name: "Billing", email: "billing@company.com" },
  ],

  // ─── Services (Support) ───────────────────────────────────────────────────
  "/services": [
    { _id: "svc1", name: "Web Development" },
    { _id: "svc2", name: "Mobile Development" },
    { _id: "svc3", name: "UI/UX Design" },
    { _id: "svc4", name: "Cloud Infrastructure" },
    { _id: "svc5", name: "Digital Marketing" },
  ],

  // ─── Predefined Replies ───────────────────────────────────────────────────
  "/predefined-replies": [
    { _id: "pr_r1", name: "Greeting", message: "Hello! Thank you for reaching out to us. How can we help you today?" },
    { _id: "pr_r2", name: "Under Investigation", message: "We have received your ticket and our team is currently investigating the issue. We will update you within 24 hours." },
    { _id: "pr_r3", name: "Resolved", message: "Great news! The issue you reported has been resolved. Please let us know if you experience any further problems." },
    { _id: "pr_r4", name: "Need More Info", message: "To better assist you, could you please provide additional details about the issue you're experiencing?" },
    { _id: "pr_r5", name: "Closing Ticket", message: "Since we haven't heard back from you in a while, we'll be closing this ticket. Feel free to open a new one if you need further assistance." },
  ],

  // ─── Knowledge Base Groups ────────────────────────────────────────────────
  "/kb/groups": [
    { _id: "kbg1", name: "Getting Started", description: "Basic guides for new users", color: "#3b82f6", order: 1, disabled: false },
    { _id: "kbg2", name: "Billing & Payments", description: "Invoices, payments, and subscription guides", color: "#10b981", order: 2, disabled: false },
    { _id: "kbg3", name: "Integrations", description: "Third-party integrations and API documentation", color: "#8b5cf6", order: 3, disabled: false },
    { _id: "kbg4", name: "Troubleshooting", description: "Common issues and how to resolve them", color: "#ef4444", order: 4, disabled: false },
  ],

  // ─── Knowledge Base Articles ──────────────────────────────────────────────
  "/kb/articles": [
    { _id: "kba1", subject: "How to create your first invoice", group: { _id: "kbg1", name: "Getting Started" }, internal: false, disabled: false, description: "Step-by-step guide to creating and sending your first invoice.", thumbs_up: 24, created_at: "2024-01-10T09:00:00Z" },
    { _id: "kba2", subject: "Setting up payment gateways", group: { _id: "kbg2", name: "Billing & Payments" }, internal: false, disabled: false, description: "Connect Stripe, PayPal, or bank transfer to receive payments.", thumbs_up: 18, created_at: "2024-01-20T10:00:00Z" },
    { _id: "kba3", subject: "Inviting team members", group: { _id: "kbg1", name: "Getting Started" }, internal: true, disabled: false, description: "How to add staff members and configure their roles and permissions.", thumbs_up: 11, created_at: "2024-02-05T09:00:00Z" },
    { _id: "kba4", subject: "Zapier integration setup", group: { _id: "kbg3", name: "Integrations" }, internal: false, disabled: false, description: "Connect your CRM to 5000+ apps via Zapier automations.", thumbs_up: 32, created_at: "2024-02-15T11:00:00Z" },
    { _id: "kba5", subject: "Troubleshooting email delivery", group: { _id: "kbg4", name: "Troubleshooting" }, internal: false, disabled: false, description: "Fix common issues with emails not being received by clients.", thumbs_up: 8, created_at: "2024-03-01T09:00:00Z" },
  ],

  // ─── Subscriptions ────────────────────────────────────────────────────────
  "/subscriptions": [
    { _id: "sub001", name: "Pro Plan - Acme Corp", customer: { _id: "c001", company: "Acme Corp" }, customer_name: "Acme Corp", amount: 299, billing_cycle: "Monthly", start_date: "2024-01-01", next_billing: "2024-06-01", status: "Active", created_at: "2024-01-01T09:00:00Z" },
    { _id: "sub002", name: "Starter Plan - TechStart", customer: { _id: "c002", company: "TechStart Inc" }, customer_name: "TechStart Inc", amount: 99, billing_cycle: "Monthly", start_date: "2024-02-01", next_billing: "2024-06-01", status: "Active", created_at: "2024-02-01T09:00:00Z" },
    { _id: "sub003", name: "Enterprise Plan - GlobalTrade", customer: { _id: "c003", company: "GlobalTrade Ltd" }, customer_name: "GlobalTrade Ltd", amount: 999, billing_cycle: "Annual", start_date: "2024-01-01", next_billing: "2025-01-01", status: "Active", created_at: "2024-01-01T09:00:00Z" },
    { _id: "sub004", name: "Pro Plan - BrightPath", customer: { _id: "c005", company: "BrightPath Agency" }, customer_name: "BrightPath Agency", amount: 299, billing_cycle: "Monthly", start_date: "2023-10-01", next_billing: "2024-01-01", status: "Cancelled", created_at: "2023-10-01T09:00:00Z" },
    { _id: "sub005", name: "Business Plan - Summit Retail", customer: { _id: "c007", company: "Summit Retail" }, customer_name: "Summit Retail", amount: 499, billing_cycle: "Monthly", start_date: "2024-05-01", next_billing: "2024-06-01", status: "Active", created_at: "2024-05-01T09:00:00Z" },
  ],

  // ─── Meetings ─────────────────────────────────────────────────────────────
  "/meetings": [
    { _id: "meet001", topic: "Q2 Project Kickoff - Acme Corp", agenda: "Discuss project scope, timeline, and deliverables", date: "2024-06-01", time: "10:00", status: "Scheduled", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "c001", name: "James Anderson" }], meeting_link: "https://meet.example.com/abc123", reminder_time: "30", created_at: "2024-05-20T09:00:00Z" },
    { _id: "meet002", topic: "Monthly Review - TechStart Inc", agenda: "Review progress on CRM integration and address blockers", date: "2024-05-28", time: "14:00", status: "Scheduled", members: [{ _id: "s002", firstname: "Alice", lastname: "Cooper" }], meeting_link: "https://meet.example.com/def456", reminder_time: "60", created_at: "2024-05-18T10:00:00Z" },
    { _id: "meet003", topic: "Sales Strategy Q3", agenda: "Plan Q3 sales targets and lead generation strategy", date: "2024-05-15", time: "11:00", status: "Completed", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s003", firstname: "Rachel", lastname: "Green" }], meeting_link: "", reminder_time: "15", created_at: "2024-05-10T09:00:00Z" },
    { _id: "meet004", topic: "Product Demo - Nexus Solutions", agenda: "Live demo of new reporting features", date: "2024-06-05", time: "15:00", status: "Scheduled", members: [{ _id: "s002", firstname: "Alice", lastname: "Cooper" }], meeting_link: "https://meet.example.com/ghi789", reminder_time: "30", created_at: "2024-05-22T09:00:00Z" },
    { _id: "meet005", topic: "Team Sprint Planning", agenda: "Sprint 12 planning - task assignment and story points", date: "2024-05-10", time: "09:00", status: "Completed", members: [{ _id: "s001", firstname: "Mike", lastname: "Brown" }, { _id: "s002", firstname: "Alice", lastname: "Cooper" }, { _id: "s003", firstname: "Rachel", lastname: "Green" }], meeting_link: "", reminder_time: "15", created_at: "2024-05-08T08:00:00Z" },
  ],

  // ─── Goals ───────────────────────────────────────────────────────────────
  "/goals": [
    { _id: "goal001", name: "Increase Monthly Revenue by 30%", description: "Grow MRR from $50k to $65k by end of Q3 through upselling and new client acquisition", type: "Revenue", start_date: "2024-01-01", end_date: "2024-09-30", progress: 48, status: "In Progress", assigned_to: { firstname: "Mike", lastname: "Brown" }, created_at: "2024-01-01T09:00:00Z" },
    { _id: "goal002", name: "Acquire 10 Enterprise Clients", description: "Close 10 enterprise deals with contract value above $50k each", type: "Sales", start_date: "2024-01-01", end_date: "2024-12-31", progress: 30, status: "In Progress", assigned_to: { firstname: "Alice", lastname: "Cooper" }, created_at: "2024-01-01T09:00:00Z" },
    { _id: "goal003", name: "Reduce Support Ticket Resolution Time to 24h", description: "Improve average first response time and resolution time across all support tiers", type: "Support", start_date: "2024-03-01", end_date: "2024-06-30", progress: 75, status: "In Progress", assigned_to: { firstname: "Rachel", lastname: "Green" }, created_at: "2024-03-01T09:00:00Z" },
    { _id: "goal004", name: "Launch Mobile App v2.0", description: "Complete and release the redesigned mobile application with offline support", type: "Product", start_date: "2024-02-01", end_date: "2024-04-30", progress: 100, status: "Completed", assigned_to: { firstname: "Alice", lastname: "Cooper" }, created_at: "2024-02-01T09:00:00Z" },
    { _id: "goal005", name: "Onboard 5 New Staff Members", description: "Hire and fully onboard 5 new team members across development and sales", type: "HR", start_date: "2024-04-01", end_date: "2024-07-31", progress: 40, status: "In Progress", assigned_to: { firstname: "John", lastname: "Davis" }, created_at: "2024-04-01T09:00:00Z" },
  ],

  // ─── Announcements ────────────────────────────────────────────────────────
  "/announcements": [
    { _id: "ann001", title: "System Maintenance - June 2 (2:00 AM - 4:00 AM)", message: "The CRM will be unavailable for scheduled maintenance on June 2nd from 2:00 AM to 4:00 AM UTC. Please save your work beforehand.", published: true, visible_to: "all", created_at: "2024-05-25T09:00:00Z" },
    { _id: "ann002", title: "New Feature: Bulk Invoice Generation", message: "You can now generate invoices in bulk from the Projects module. Select multiple completed tasks and click 'Generate Invoice'.", published: true, visible_to: "all", created_at: "2024-05-20T10:00:00Z" },
    { _id: "ann003", title: "Q2 Sales Targets Reminder", message: "Team, we are 65% through Q2 and at 48% of our revenue target. Let's push hard in the remaining weeks. Check your individual targets in Goals.", published: true, visible_to: "staff", created_at: "2024-05-15T08:00:00Z" },
    { _id: "ann004", title: "Welcome to the Fuerte CRM Platform!", message: "We are excited to welcome all new users to Fuerte CRM. Explore the modules, check out the knowledge base, and reach out to support with any questions.", published: true, visible_to: "all", created_at: "2024-01-01T09:00:00Z" },
    { _id: "ann005", title: "Updated Privacy Policy", message: "Our privacy policy has been updated effective June 1st, 2024. Please review the changes at your earliest convenience.", published: false, visible_to: "all", created_at: "2024-05-28T11:00:00Z" },
  ],

  // ─── Roles ───────────────────────────────────────────────────────────────
  "/roles": [
    { _id: "role1", name: "Developer", description: "Full-stack software developer with code access" },
    { _id: "role2", name: "Designer", description: "UI/UX and graphic design team member" },
    { _id: "role3", name: "Sales Manager", description: "Manages leads, proposals, and client relationships" },
    { _id: "role4", name: "HR Manager", description: "Human resources and team management" },
    { _id: "role5", name: "Support Agent", description: "Handles customer support tickets" },
    { _id: "role6", name: "Project Manager", description: "Oversees project delivery and timelines" },
  ],

  // ─── Tax Rates ───────────────────────────────────────────────────────────
  "/taxes": [
    { _id: "tax1", name: "GST 18%", rate: 18, created_at: "2024-01-01T09:00:00Z" },
    { _id: "tax2", name: "GST 5%", rate: 5, created_at: "2024-01-01T09:00:00Z" },
    { _id: "tax3", name: "GST 12%", rate: 12, created_at: "2024-01-01T09:00:00Z" },
    { _id: "tax4", name: "VAT 20%", rate: 20, created_at: "2024-01-01T09:00:00Z" },
    { _id: "tax5", name: "Zero Rated", rate: 0, created_at: "2024-01-01T09:00:00Z" },
  ],

  // ─── Currencies ───────────────────────────────────────────────────────────
  "/currencies": [
    { _id: "cur1", name: "US Dollar", symbol: "$", code: "USD", rate: 1 },
    { _id: "cur2", name: "Euro", symbol: "€", code: "EUR", rate: 0.92 },
    { _id: "cur3", name: "British Pound", symbol: "£", code: "GBP", rate: 0.79 },
    { _id: "cur4", name: "Indian Rupee", symbol: "₹", code: "INR", rate: 83.2 },
    { _id: "cur5", name: "Australian Dollar", symbol: "A$", code: "AUD", rate: 1.53 },
  ],

  // ─── Payment Modes ────────────────────────────────────────────────────────
  "/payment-modes": [
    { _id: "pm1", name: "Bank Transfer", description: "Direct bank-to-bank wire transfer" },
    { _id: "pm2", name: "UPI", description: "Unified Payments Interface (India)" },
    { _id: "pm3", name: "Credit Card", description: "Visa, Mastercard, Amex" },
    { _id: "pm4", name: "PayPal", description: "Online payment via PayPal" },
    { _id: "pm5", name: "Cheque", description: "Physical cheque payment" },
  ],

  // ─── Expense Categories ───────────────────────────────────────────────────
  "/expense-categories": [
    { _id: "ec1", name: "Travel", description: "Flights, hotels, and transportation" },
    { _id: "ec2", name: "Software", description: "Software licenses and subscriptions" },
    { _id: "ec3", name: "Marketing", description: "Advertising and marketing campaigns" },
    { _id: "ec4", name: "Equipment", description: "Hardware and office equipment" },
    { _id: "ec5", name: "Utilities", description: "Office utilities and rent" },
    { _id: "ec6", name: "Training", description: "Courses, certifications, conferences" },
  ],

  // ─── Time Entries ─────────────────────────────────────────────────────────
  "/time-entries": [
    { _id: "te001", task: { _id: "t001", name: "Design homepage mockup" }, staff: { _id: "s002", firstname: "Alice", lastname: "Cooper" }, start_time: "2024-05-20T09:00:00Z", end_time: "2024-05-20T13:00:00Z", hours: 4, note: "Initial wireframes and color palette", billable: true },
    { _id: "te002", task: { _id: "t002", name: "Set up CI/CD pipeline" }, staff: { _id: "s001", firstname: "Mike", lastname: "Brown" }, start_time: "2024-05-21T10:00:00Z", end_time: "2024-05-21T16:00:00Z", hours: 6, note: "GitHub Actions workflow configuration", billable: false },
    { _id: "te003", task: { _id: "t003", name: "Write API documentation" }, staff: { _id: "s003", firstname: "Rachel", lastname: "Green" }, start_time: "2024-05-22T09:30:00Z", end_time: "2024-05-22T12:30:00Z", hours: 3, note: "REST endpoints and authentication docs", billable: true },
    { _id: "te004", task: { _id: "t006", name: "Migrate legacy database" }, staff: { _id: "s001", firstname: "Mike", lastname: "Brown" }, start_time: "2024-05-23T08:00:00Z", end_time: "2024-05-23T17:00:00Z", hours: 9, note: "Schema migration and data validation", billable: true },
    { _id: "te005", task: { _id: "t001", name: "Design homepage mockup" }, staff: { _id: "s002", firstname: "Alice", lastname: "Cooper" }, start_time: "2024-05-23T14:00:00Z", end_time: "2024-05-23T18:00:00Z", hours: 4, note: "High-fidelity mockup revisions", billable: true },
  ],

  // ─── Activity Logs ────────────────────────────────────────────────────────
  "/activity-logs": [
    { _id: "al001", action: "Created invoice INV-2024-006", user: { firstname: "Mike", lastname: "Brown" }, type: "invoice", created_at: "2024-05-25T10:30:00Z" },
    { _id: "al002", action: "Updated lead status for Alice Foster to Hot", user: { firstname: "Rachel", lastname: "Green" }, type: "lead", created_at: "2024-05-25T09:15:00Z" },
    { _id: "al003", action: "Closed support ticket TKT-005", user: { firstname: "Chris", lastname: "Taylor" }, type: "ticket", created_at: "2024-05-24T16:00:00Z" },
    { _id: "al004", action: "Created new project: E-commerce Platform", user: { firstname: "Mike", lastname: "Brown" }, type: "project", created_at: "2024-05-23T11:00:00Z" },
    { _id: "al005", action: "Payment received for INV-2024-001", user: { firstname: "Alice", lastname: "Cooper" }, type: "payment", created_at: "2024-05-22T14:30:00Z" },
  ],

};
