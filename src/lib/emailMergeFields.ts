// ─── Merge-field reference shown on the Email Template edit page ───────────
// Purely informational (copy-paste reference for template authors) — mirrors
// the "Available merge fields" panel design. Grouped by module so each
// template only shows the tags relevant to it, plus a common "Other" group.

export type MergeField = { label: string; tag: string };
export type MergeFieldGroup = { title: string; fields: MergeField[] };

const CLIENT_FIELDS: MergeField[] = [
  { label: "Contact Firstname", tag: "{contact_firstname}" },
  { label: "Contact Lastname", tag: "{contact_lastname}" },
  { label: "Contact Phone Number", tag: "{contact_phonenumber}" },
  { label: "Contact Title", tag: "{contact_title}" },
  { label: "Contact Email", tag: "{contact_email}" },
  { label: "Client Company", tag: "{client_company}" },
  { label: "Client Phone Number", tag: "{client_phonenumber}" },
  { label: "Client Country", tag: "{client_country}" },
  { label: "Client City", tag: "{client_city}" },
  { label: "Client Zip", tag: "{client_zip}" },
  { label: "Client State", tag: "{client_state}" },
  { label: "Client Address", tag: "{client_address}" },
  { label: "Client Vat Number", tag: "{client_vat_number}" },
  { label: "Client ID", tag: "{client_id}" },
  { label: "Client Website", tag: "{client_website}" },
];

const STAFF_FIELDS: MergeField[] = [
  { label: "Staff Firstname", tag: "{staff_firstname}" },
  { label: "Staff Lastname", tag: "{staff_lastname}" },
  { label: "Staff Email", tag: "{staff_email}" },
];

const OTHER_FIELDS: MergeField[] = [
  { label: "Logo URL", tag: "{logo_url}" },
  { label: "Logo image with URL", tag: "{logo_image_with_url}" },
  { label: "Dark logo image with URL", tag: "{dark_logo_image_with_url}" },
  { label: "CRM URL", tag: "{crm_url}" },
  { label: "Admin URL", tag: "{admin_url}" },
  { label: "Main Domain", tag: "{main_domain}" },
  { label: "Company Name", tag: "{companyname}" },
  { label: "Email Signature", tag: "{email_signature}" },
  { label: "(GDPR) Terms & Conditions URL", tag: "{terms_and_conditions_url}" },
  { label: "(GDPR) Privacy Policy URL", tag: "{privacy_policy_url}" },
];

const MODULE_FIELDS: Record<string, MergeField[]> = {
  Tickets: [
    { label: "Ticket ID", tag: "{ticket_id}" },
    { label: "Ticket URL", tag: "{ticket_url}" },
    { label: "Ticket Public URL", tag: "{ticket_public_url}" },
    { label: "Department", tag: "{ticket_department}" },
    { label: "Department Email", tag: "{ticket_department_email}" },
    { label: "Date Opened", tag: "{ticket_date}" },
    { label: "Ticket Subject", tag: "{ticket_subject}" },
    { label: "Ticket Message", tag: "{ticket_message}" },
    { label: "Ticket Status", tag: "{ticket_status}" },
    { label: "Ticket Priority", tag: "{ticket_priority}" },
    { label: "Ticket Service", tag: "{ticket_service}" },
    { label: "Project name", tag: "{project_name}" },
  ],
  Estimates: [
    { label: "Estimate Number", tag: "{estimate_number}" },
    { label: "Estimate URL", tag: "{estimate_url}" },
    { label: "Estimate Total", tag: "{estimate_total}" },
    { label: "Estimate Expiry Date", tag: "{estimate_expirydate}" },
  ],
  Contracts: [
    { label: "Contract Subject", tag: "{contract_subject}" },
    { label: "Contract URL", tag: "{contract_url}" },
    { label: "Contract End Date", tag: "{contract_enddate}" },
    { label: "Comment Content", tag: "{comment_content}" },
  ],
  Invoices: [
    { label: "Invoice Number", tag: "{invoice_number}" },
    { label: "Invoice URL", tag: "{invoice_url}" },
    { label: "Invoice Total", tag: "{invoice_total}" },
    { label: "Invoice Due Date", tag: "{invoice_duedate}" },
    { label: "Payment Amount", tag: "{payment_amount}" },
  ],
  Subscriptions: [
    { label: "Subscription Name", tag: "{subscription_name}" },
    { label: "Subscription URL", tag: "{subscription_url}" },
  ],
  "Credit Note": [
    { label: "Credit Note Number", tag: "{credit_note_number}" },
    { label: "Credit Note Total", tag: "{credit_note_total}" },
  ],
  Tasks: [
    { label: "Task Name", tag: "{task_name}" },
    { label: "Task URL", tag: "{task_url}" },
    { label: "Task Due Date", tag: "{task_duedate}" },
    { label: "Task Status", tag: "{task_status}" },
    { label: "Comment Content", tag: "{comment_content}" },
  ],
  Customers: [
    { label: "Reset Password URL", tag: "{reset_password_url}" },
    { label: "Set Password URL", tag: "{set_password_url}" },
    { label: "Email Verification URL", tag: "{email_verification_url}" },
    { label: "Client Area URL", tag: "{client_area_url}" },
  ],
  Proposals: [
    { label: "Proposal Subject", tag: "{proposal_subject}" },
    { label: "Proposal URL", tag: "{proposal_url}" },
    { label: "Proposal Open Till", tag: "{proposal_open_till}" },
    { label: "Comment Content", tag: "{comment_content}" },
  ],
  Projects: [
    { label: "Project Name", tag: "{project_name}" },
    { label: "Project URL", tag: "{project_url}" },
    { label: "Discussion Subject", tag: "{discussion_subject}" },
    { label: "Comment Content", tag: "{comment_content}" },
  ],
  "Staff Members": [
    { label: "Staff Login URL", tag: "{staff_login_url}" },
    { label: "Reset Password URL", tag: "{reset_password_url}" },
    { label: "OTP Code", tag: "{otp_code}" },
    { label: "Reminder Description", tag: "{reminder_description}" },
    { label: "Reminder Date", tag: "{reminder_date}" },
    { label: "Event Name", tag: "{event_name}" },
    { label: "Event Date", tag: "{event_date}" },
  ],
  Leads: [
    { label: "Lead Name", tag: "{lead_name}" },
    { label: "Lead URL", tag: "{lead_url}" },
  ],
  "Estimate Request": [
    { label: "Form Name", tag: "{form_name}" },
    { label: "Request Date", tag: "{request_date}" },
  ],
  Notifications: [
    { label: "Task Name", tag: "{task_name}" },
  ],
  "General Data Protection Regulation (GDPR)": [
    { label: "Lead Name", tag: "{lead_name}" },
  ],
};

export const getMergeFieldGroups = (module: string): MergeFieldGroup[] => {
  const groups: MergeFieldGroup[] = [];
  const usesStaff = ["Tasks", "Staff Members", "Notifications"].includes(module);
  groups.push({ title: usesStaff ? "Staff" : "Client", fields: usesStaff ? STAFF_FIELDS : CLIENT_FIELDS });

  const moduleSpecific = MODULE_FIELDS[module];
  if (moduleSpecific?.length) {
    groups.push({ title: module === "Tickets" ? "Ticket" : module, fields: moduleSpecific });
  }

  groups.push({ title: "Other", fields: OTHER_FIELDS });
  return groups;
};
