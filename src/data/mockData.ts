// Mock data for CRM Dashboard

export const dashboardStats = {
  totalProjects: 24,
  activeTasks: 156,
  customers: 89,
  pendingInvoices: 12,
  monthlyExpenses: 45230,
};

export const revenueData = [
  { month: "Jan", revenue: 12400, expenses: 8200 },
  { month: "Feb", revenue: 15800, expenses: 9100 },
  { month: "Mar", revenue: 18200, expenses: 10400 },
  { month: "Apr", revenue: 16900, expenses: 9800 },
  { month: "May", revenue: 21500, expenses: 11200 },
  { month: "Jun", revenue: 24100, expenses: 12800 },
  { month: "Jul", revenue: 22800, expenses: 11900 },
  { month: "Aug", revenue: 26400, expenses: 13500 },
  { month: "Sep", revenue: 28900, expenses: 14200 },
  { month: "Oct", revenue: 25600, expenses: 12900 },
  { month: "Nov", revenue: 30200, expenses: 15100 },
  { month: "Dec", revenue: 32800, expenses: 16400 },
];

export const taskProgressData = [
  { name: "To Do", value: 35, fill: "hsl(215, 16%, 47%)" },
  { name: "In Progress", value: 45, fill: "hsl(213, 44%, 25%)" },
  { name: "Done", value: 76, fill: "hsl(142, 71%, 45%)" },
];

export const recentActivities = [
  { id: 1, user: "Sarah Chen", action: "completed task", target: "Homepage Redesign", time: "5 min ago", avatar: "SC" },
  { id: 2, user: "Mike Johnson", action: "created invoice", target: "INV-0042", time: "15 min ago", avatar: "MJ" },
  { id: 3, user: "Emily Davis", action: "added customer", target: "Acme Corp", time: "1 hour ago", avatar: "ED" },
  { id: 4, user: "Alex Turner", action: "updated project", target: "Mobile App v2", time: "2 hours ago", avatar: "AT" },
  { id: 5, user: "Lisa Park", action: "submitted expense", target: "₹450 - Software License", time: "3 hours ago", avatar: "LP" },
  { id: 6, user: "Tom Wilson", action: "moved task to Done", target: "API Integration", time: "4 hours ago", avatar: "TW" },
];

export type Project = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Completed" | "On Hold";
  progress: number;
  team: { name: string; avatar: string }[];
  startDate: string;
  endDate: string;
  tasksCompleted: number;
  totalTasks: number;
};

export const projects: Project[] = [
  { id: "p1", name: "Website Redesign", description: "Complete overhaul of the company website with modern UI", status: "Active", progress: 65, team: [{ name: "Sarah Chen", avatar: "SC" }, { name: "Mike Johnson", avatar: "MJ" }], startDate: "2026-01-15", endDate: "2026-04-30", tasksCompleted: 13, totalTasks: 20 },
  { id: "p2", name: "Mobile App v2", description: "Second version of the mobile app with new features", status: "Active", progress: 40, team: [{ name: "Alex Turner", avatar: "AT" }, { name: "Lisa Park", avatar: "LP" }, { name: "Tom Wilson", avatar: "TW" }], startDate: "2026-02-01", endDate: "2026-06-30", tasksCompleted: 8, totalTasks: 20 },
  { id: "p3", name: "CRM Integration", description: "Integrate CRM with third-party services", status: "Completed", progress: 100, team: [{ name: "Emily Davis", avatar: "ED" }, { name: "Sarah Chen", avatar: "SC" }], startDate: "2025-10-01", endDate: "2026-01-15", tasksCompleted: 15, totalTasks: 15 },
  { id: "p4", name: "Data Analytics Dashboard", description: "Build internal analytics dashboard for business insights", status: "On Hold", progress: 20, team: [{ name: "Mike Johnson", avatar: "MJ" }], startDate: "2026-01-01", endDate: "2026-05-15", tasksCompleted: 3, totalTasks: 15 },
  { id: "p5", name: "E-commerce Platform", description: "Build a new e-commerce storefront", status: "Active", progress: 55, team: [{ name: "Tom Wilson", avatar: "TW" }, { name: "Emily Davis", avatar: "ED" }, { name: "Alex Turner", avatar: "AT" }], startDate: "2025-12-01", endDate: "2026-05-30", tasksCompleted: 11, totalTasks: 20 },
];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Done";
  priority: "Low" | "Medium" | "High";
  assignee: { name: string; avatar: string };
  dueDate: string;
  project: string;
  tags?: string[];
  startDate?: string;
};

export const tasks: Task[] = [
  { id: "t1", title: "Design landing page mockup", description: "Create high-fidelity mockup for the new landing page", status: "To Do", priority: "High", assignee: { name: "Sarah Chen", avatar: "SC" }, dueDate: "2026-03-15", project: "Website Redesign", tags: ["design", "ui"], startDate: "2026-03-01" },
  { id: "t2", title: "Implement user authentication", description: "Set up OAuth and email login", status: "In Progress", priority: "High", assignee: { name: "Alex Turner", avatar: "AT" }, dueDate: "2026-03-12", project: "Mobile App v2", tags: ["backend", "auth"], startDate: "2026-03-02" },
  { id: "t3", title: "Write API documentation", description: "Document all REST API endpoints", status: "To Do", priority: "Medium", assignee: { name: "Mike Johnson", avatar: "MJ" }, dueDate: "2026-03-20", project: "CRM Integration", tags: ["docs"], startDate: "2026-03-05" },
  { id: "t4", title: "Fix navigation bug", description: "Sidebar navigation not working on mobile", status: "In Progress", priority: "High", assignee: { name: "Tom Wilson", avatar: "TW" }, dueDate: "2026-03-10", project: "Website Redesign", tags: ["bug", "mobile"], startDate: "2026-03-03" },
  { id: "t5", title: "Set up CI/CD pipeline", description: "Configure automated testing and deployment", status: "Done", priority: "Medium", assignee: { name: "Lisa Park", avatar: "LP" }, dueDate: "2026-03-08", project: "Mobile App v2", tags: ["devops"], startDate: "2026-02-25" },
  { id: "t6", title: "Create onboarding flow", description: "Design and implement user onboarding experience", status: "To Do", priority: "Low", assignee: { name: "Emily Davis", avatar: "ED" }, dueDate: "2026-03-25", project: "E-commerce Platform", tags: ["ux"], startDate: "2026-03-10" },
  { id: "t7", title: "Database optimization", description: "Optimize slow queries and add indexes", status: "In Progress", priority: "Medium", assignee: { name: "Alex Turner", avatar: "AT" }, dueDate: "2026-03-14", project: "Data Analytics Dashboard", tags: ["backend", "performance"], startDate: "2026-03-04" },
  { id: "t8", title: "Payment integration", description: "Integrate Stripe payment processing", status: "To Do", priority: "High", assignee: { name: "Tom Wilson", avatar: "TW" }, dueDate: "2026-03-18", project: "E-commerce Platform", tags: ["payments"], startDate: "2026-03-08" },
  { id: "t9", title: "Unit test coverage", description: "Increase test coverage to 80%", status: "Done", priority: "Low", assignee: { name: "Mike Johnson", avatar: "MJ" }, dueDate: "2026-03-05", project: "CRM Integration", tags: ["testing"], startDate: "2026-02-20" },
  { id: "t10", title: "Dashboard charts", description: "Add interactive charts to the analytics dashboard", status: "To Do", priority: "Medium", assignee: { name: "Sarah Chen", avatar: "SC" }, dueDate: "2026-03-22", project: "Data Analytics Dashboard", tags: ["frontend", "charts"], startDate: "2026-03-12" },
];

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "Active" | "Lead" | "Inactive";
  totalSpent: number;
  projects: number;
  avatar: string;
  joinDate: string;
  active: boolean;
  groups?: string[];
};

export const customers: Customer[] = [
  { id: "c1", name: "James Rodriguez", email: "james@acmecorp.com", phone: "+1 555-0101", company: "Acme Corp", status: "Active", totalSpent: 52400, projects: 3, avatar: "JR", joinDate: "2025-06-15", active: true, groups: ["Enterprise"] },
  { id: "c2", name: "Amanda Foster", email: "amanda@globex.com", phone: "+1 555-0102", company: "Globex Inc", status: "Active", totalSpent: 38900, projects: 2, avatar: "AF", joinDate: "2025-08-22", active: true, groups: ["SMB"] },
  { id: "c3", name: "Robert Kim", email: "robert@initech.com", phone: "+1 555-0103", company: "Initech", status: "Lead", totalSpent: 0, projects: 0, avatar: "RK", joinDate: "2026-02-10", active: true },
  { id: "c4", name: "Diana Prince", email: "diana@wayne.com", phone: "+1 555-0104", company: "Wayne Enterprises", status: "Active", totalSpent: 94200, projects: 5, avatar: "DP", joinDate: "2025-03-01", active: true, groups: ["Enterprise", "VIP"] },
  { id: "c5", name: "Carlos Mendez", email: "carlos@stark.com", phone: "+1 555-0105", company: "Stark Industries", status: "Inactive", totalSpent: 12800, projects: 1, avatar: "CM", joinDate: "2025-09-14", active: false },
  { id: "c6", name: "Nina Patel", email: "nina@umbrella.com", phone: "+1 555-0106", company: "Umbrella Corp", status: "Lead", totalSpent: 0, projects: 0, avatar: "NP", joinDate: "2026-03-01", active: true },
];

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  issueDate: string;
  dueDate: string;
  items: { description: string; quantity: number; rate: number }[];
};

export const invoices: Invoice[] = [
  { id: "i1", number: "INV-0038", customer: "Acme Corp", amount: 12500, status: "Paid", issueDate: "2026-02-01", dueDate: "2026-03-01", items: [{ description: "Web Development", quantity: 50, rate: 150 }, { description: "UI Design", quantity: 20, rate: 125 }] },
  { id: "i2", number: "INV-0039", customer: "Globex Inc", amount: 8400, status: "Pending", issueDate: "2026-02-15", dueDate: "2026-03-15", items: [{ description: "API Integration", quantity: 40, rate: 150 }, { description: "Testing", quantity: 16, rate: 100 }] },
  { id: "i3", number: "INV-0040", customer: "Wayne Enterprises", amount: 24800, status: "Paid", issueDate: "2026-01-20", dueDate: "2026-02-20", items: [{ description: "Full Stack Development", quantity: 120, rate: 175 }, { description: "DevOps Setup", quantity: 16, rate: 200 }] },
  { id: "i4", number: "INV-0041", customer: "Stark Industries", amount: 5600, status: "Overdue", issueDate: "2026-01-10", dueDate: "2026-02-10", items: [{ description: "Consulting", quantity: 28, rate: 200 }] },
  { id: "i5", number: "INV-0042", customer: "Acme Corp", amount: 15200, status: "Pending", issueDate: "2026-03-01", dueDate: "2026-04-01", items: [{ description: "Mobile App Development", quantity: 80, rate: 160 }, { description: "QA Testing", quantity: 24, rate: 100 }] },
];

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: "Software" | "Hardware" | "Travel" | "Marketing" | "Office" | "Other";
  date: string;
  submittedBy: string;
};

export const expenses: Expense[] = [
  { id: "e1", description: "AWS Hosting - Monthly", amount: 2400, category: "Software", date: "2026-03-01", submittedBy: "Alex Turner" },
  { id: "e2", description: "Team Offsite - Hotel", amount: 3800, category: "Travel", date: "2026-02-25", submittedBy: "Sarah Chen" },
  { id: "e3", description: "Google Ads Campaign", amount: 5200, category: "Marketing", date: "2026-03-03", submittedBy: "Emily Davis" },
  { id: "e4", description: "MacBook Pro - New Hire", amount: 2499, category: "Hardware", date: "2026-02-20", submittedBy: "Mike Johnson" },
  { id: "e5", description: "Figma Enterprise License", amount: 450, category: "Software", date: "2026-03-01", submittedBy: "Lisa Park" },
  { id: "e6", description: "Office Supplies", amount: 320, category: "Office", date: "2026-02-28", submittedBy: "Tom Wilson" },
  { id: "e7", description: "Conference Tickets", amount: 1200, category: "Travel", date: "2026-03-05", submittedBy: "Sarah Chen" },
  { id: "e8", description: "LinkedIn Ads", amount: 3100, category: "Marketing", date: "2026-02-15", submittedBy: "Emily Davis" },
];

export const expenseByCategory = [
  { category: "Software", amount: 2850 },
  { category: "Hardware", amount: 2499 },
  { category: "Travel", amount: 5000 },
  { category: "Marketing", amount: 8300 },
  { category: "Office", amount: 320 },
];

export const notifications = [
  { id: 1, type: "task" as const, title: "New task assigned", message: "You've been assigned 'Design landing page mockup'", time: "5 min ago", read: false },
  { id: 2, type: "invoice" as const, title: "Invoice payment received", message: "INV-0038 from Acme Corp has been paid", time: "1 hour ago", read: false },
  { id: 3, type: "project" as const, title: "Project update", message: "Mobile App v2 reached 40% completion", time: "3 hours ago", read: true },
  { id: 4, type: "task" as const, title: "Task overdue", message: "'Fix navigation bug' is past its due date", time: "5 hours ago", read: true },
  { id: 5, type: "invoice" as const, title: "Invoice overdue", message: "INV-0041 from Stark Industries is overdue", time: "1 day ago", read: true },
];

export const teamProductivity = [
  { name: "Sarah Chen", tasksCompleted: 24, avatar: "SC" },
  { name: "Alex Turner", tasksCompleted: 21, avatar: "AT" },
  { name: "Mike Johnson", tasksCompleted: 18, avatar: "MJ" },
  { name: "Tom Wilson", tasksCompleted: 16, avatar: "TW" },
  { name: "Emily Davis", tasksCompleted: 15, avatar: "ED" },
  { name: "Lisa Park", tasksCompleted: 12, avatar: "LP" },
];

// Invoice overview data
export const invoiceOverview = {
  draft: 0,
  notSent: 0,
  unpaid: 2,
  partiallyPaid: 0,
  overdue: 1,
  paid: 2,
  total: 5,
};

// Estimate overview data
export const estimateOverview = {
  draft: 0,
  notSent: 0,
  sent: 1,
  expired: 0,
  declined: 0,
  accepted: 1,
  total: 2,
};

// Proposal overview data
export const proposalOverview = {
  draft: 1,
  sent: 0,
  open: 0,
  revised: 0,
  declined: 0,
  accepted: 1,
  total: 2,
};

// To-do items
export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
};

export const todoItems: TodoItem[] = [
  { id: "td1", title: "Review project proposal for Acme Corp", completed: false, dueDate: "2026-03-10", priority: "High" },
  { id: "td2", title: "Send follow-up to Globex Inc", completed: false, dueDate: "2026-03-08", priority: "Medium" },
  { id: "td3", title: "Update team meeting agenda", completed: true, dueDate: "2026-03-06", priority: "Low" },
  { id: "td4", title: "Prepare monthly expense report", completed: true, dueDate: "2026-03-05", priority: "Medium" },
];

// Leads overview data
export const leadsOverview = [
  { name: "Pending", value: 3, fill: "hsl(270, 60%, 50%)" },
  { name: "Followup", value: 5, fill: "hsl(45, 90%, 50%)" },
  { name: "Hot Lead", value: 2, fill: "hsl(142, 71%, 45%)" },
  { name: "Cold Lead", value: 4, fill: "hsl(25, 90%, 55%)" },
  { name: "Warm Lead", value: 3, fill: "hsl(45, 70%, 45%)" },
  { name: "Dead Lead", value: 1, fill: "hsl(0, 70%, 55%)" },
  { name: "Customer", value: 6, fill: "hsl(142, 60%, 40%)" },
  { name: "Lost Leads", value: 2, fill: "hsl(0, 80%, 50%)" },
];

// Project status overview
export const projectStatusOverview = [
  { name: "Not Started", value: 2, fill: "hsl(215, 20%, 35%)" },
  { name: "In Progress", value: 3, fill: "hsl(213, 44%, 25%)" },
  { name: "On Hold", value: 1, fill: "hsl(25, 90%, 55%)" },
  { name: "Cancelled", value: 0, fill: "hsl(215, 16%, 75%)" },
  { name: "Finished", value: 1, fill: "hsl(142, 71%, 45%)" },
];

// Support tickets
export type Ticket = {
  id: string;
  subject: string;
  status: "Open" | "In Progress" | "Closed";
  priority: "Low" | "Medium" | "High";
  customer: string;
  createdAt: string;
};

export const tickets: Ticket[] = [
  { id: "tk1", subject: "Login issue with SSO", status: "Open", priority: "High", customer: "Acme Corp", createdAt: "2026-03-06" },
  { id: "tk2", subject: "Feature request: Export CSV", status: "In Progress", priority: "Medium", customer: "Globex Inc", createdAt: "2026-03-05" },
  { id: "tk3", subject: "Billing discrepancy", status: "Open", priority: "High", customer: "Wayne Enterprises", createdAt: "2026-03-04" },
  { id: "tk4", subject: "UI bug on mobile", status: "Closed", priority: "Low", customer: "Stark Industries", createdAt: "2026-03-02" },
];

// Announcements
export type Announcement = {
  id: string;
  title: string;
  message: string;
  date: string;
  author: string;
};

export const announcements: Announcement[] = [
  { id: "a1", title: "System Maintenance", message: "Scheduled maintenance on March 15, 2026 from 2-4 AM UTC", date: "2026-03-07", author: "System Admin" },
  { id: "a2", title: "New Feature: Calendar View", message: "We've added a calendar view to help you manage schedules better", date: "2026-03-05", author: "Product Team" },
  { id: "a3", title: "Q1 Review Meeting", message: "All-hands meeting on March 20 at 10 AM. Please prepare your reports.", date: "2026-03-04", author: "HR Team" },
];

// Reminders
export type Reminder = {
  id: string;
  title: string;
  date: string;
  isNotified: boolean;
  description?: string;
};

export const reminders: Reminder[] = [
  { id: "r1", title: "Follow up with Acme Corp", date: "2026-03-10", isNotified: false, description: "Discuss renewal terms" },
  { id: "r2", title: "Submit quarterly report", date: "2026-03-15", isNotified: false, description: "Q1 financial report" },
  { id: "r3", title: "Team standup", date: "2026-03-08", isNotified: true, description: "Daily sync" },
];

// Subscriptions
export type Subscription = {
  id: string;
  customer: string;
  plan: string;
  amount: number;
  status: "Active" | "Cancelled" | "Expired";
  startDate: string;
  nextBilling: string;
};

export const subscriptions: Subscription[] = [
  { id: "s1", customer: "Acme Corp", plan: "Enterprise", amount: 2999, status: "Active", startDate: "2025-06-01", nextBilling: "2026-04-01" },
  { id: "s2", customer: "Globex Inc", plan: "Professional", amount: 999, status: "Active", startDate: "2025-08-15", nextBilling: "2026-04-15" },
  { id: "s3", customer: "Wayne Enterprises", plan: "Enterprise", amount: 2999, status: "Active", startDate: "2025-03-01", nextBilling: "2026-04-01" },
  { id: "s4", customer: "Stark Industries", plan: "Starter", amount: 299, status: "Cancelled", startDate: "2025-09-01", nextBilling: "-" },
];

// Contracts
export type Contract = {
  id: string;
  title: string;
  customer: string;
  value: number;
  status: "Active" | "Draft" | "Expired" | "Signed";
  startDate: string;
  endDate: string;
};

export const contracts: Contract[] = [
  { id: "ct1", title: "Annual Service Agreement", customer: "Acme Corp", value: 156000, status: "Active", startDate: "2026-01-01", endDate: "2026-12-31" },
  { id: "ct2", title: "Development Contract", customer: "Wayne Enterprises", value: 240000, status: "Active", startDate: "2025-06-01", endDate: "2026-05-31" },
  { id: "ct3", title: "Maintenance Agreement", customer: "Globex Inc", value: 48000, status: "Signed", startDate: "2026-04-01", endDate: "2027-03-31" },
  { id: "ct4", title: "Consulting Retainer", customer: "Stark Industries", value: 36000, status: "Expired", startDate: "2025-01-01", endDate: "2025-12-31" },
];

// Leads
export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  status: "Pending" | "Followup" | "Hot Lead" | "Cold Lead" | "Warm Lead" | "Dead Lead" | "Customer" | "Lost";
  value: number;
  assignedTo: string;
  createdAt: string;
};

export const leads: Lead[] = [
  { id: "l1", name: "John Smith", email: "john@techco.com", company: "TechCo", source: "Website", status: "Hot Lead", value: 50000, assignedTo: "Sarah Chen", createdAt: "2026-03-01" },
  { id: "l2", name: "Maria Garcia", email: "maria@innovate.com", company: "Innovate Ltd", source: "Referral", status: "Followup", value: 35000, assignedTo: "Mike Johnson", createdAt: "2026-02-28" },
  { id: "l3", name: "David Lee", email: "david@bigcorp.com", company: "BigCorp", source: "LinkedIn", status: "Warm Lead", value: 120000, assignedTo: "Emily Davis", createdAt: "2026-02-25" },
  { id: "l4", name: "Sophie Brown", email: "sophie@startup.io", company: "Startup.io", source: "Cold Call", status: "Cold Lead", value: 15000, assignedTo: "Alex Turner", createdAt: "2026-03-03" },
  { id: "l5", name: "Ahmed Hassan", email: "ahmed@gulf.com", company: "Gulf Enterprises", source: "Conference", status: "Pending", value: 75000, assignedTo: "Tom Wilson", createdAt: "2026-03-05" },
];

// Calendar events
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "meeting" | "deadline" | "reminder" | "event";
  color: string;
};

export const calendarEvents: CalendarEvent[] = [
  { id: "ev1", title: "Team Standup", date: "2026-03-07", time: "09:00", type: "meeting", color: "hsl(213, 44%, 25%)" },
  { id: "ev2", title: "Client Meeting - Acme", date: "2026-03-10", time: "14:00", type: "meeting", color: "hsl(213, 44%, 25%)" },
  { id: "ev3", title: "Project Deadline", date: "2026-03-15", time: "17:00", type: "deadline", color: "hsl(0, 70%, 55%)" },
  { id: "ev4", title: "Quarterly Review", date: "2026-03-20", time: "10:00", type: "event", color: "hsl(152, 69%, 40%)" },
  { id: "ev5", title: "Follow up - Globex", date: "2026-03-12", time: "11:00", type: "reminder", color: "hsl(45, 90%, 50%)" },
  { id: "ev6", title: "Sprint Planning", date: "2026-03-08", time: "10:00", type: "meeting", color: "hsl(213, 44%, 25%)" },
  { id: "ev7", title: "Invoice Due - Wayne", date: "2026-03-18", time: "00:00", type: "deadline", color: "hsl(0, 70%, 55%)" },
];

// Estimate Requests
export type EstimateRequest = {
  id: string;
  title: string;
  customer: string;
  description: string;
  value: number;
  status: "Pending" | "Reviewed" | "Accepted" | "Declined";
  createdAt: string;
};

// Knowledge Base
export type KnowledgeArticle = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  views: number;
  likes: number;
  createdAt: string;
};

export const knowledgeArticles: KnowledgeArticle[] = [
  { id: "kb1", title: "Getting Started with CRMPro", category: "Getting Started", excerpt: "Learn the basics of navigating and using CRMPro for your business needs. This guide covers setup, configuration, and your first steps.", author: "System Admin", views: 1240, likes: 89, createdAt: "2026-01-10" },
  { id: "kb2", title: "Managing Customer Relationships", category: "Customers", excerpt: "Best practices for managing customer data, tracking interactions, and building lasting relationships through CRMPro.", author: "Sarah Chen", views: 856, likes: 62, createdAt: "2026-01-22" },
  { id: "kb3", title: "Invoice & Billing Guide", category: "Billing", excerpt: "Complete guide to creating invoices, managing payments, and handling billing workflows in the system.", author: "Mike Johnson", views: 634, likes: 45, createdAt: "2026-02-05" },
  { id: "kb4", title: "Project Management Tips", category: "Projects", excerpt: "Tips and strategies for effective project management, task delegation, and timeline tracking.", author: "Emily Davis", views: 478, likes: 33, createdAt: "2026-02-15" },
  { id: "kb5", title: "Reporting & Analytics", category: "Reports", excerpt: "How to generate reports, understand analytics dashboards, and make data-driven decisions.", author: "Alex Turner", views: 392, likes: 28, createdAt: "2026-02-28" },
  { id: "kb6", title: "API Integration Guide", category: "Technical", excerpt: "Developer documentation for integrating external services via our REST API endpoints.", author: "Tom Wilson", views: 267, likes: 19, createdAt: "2026-03-01" },
];

// Employees
export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: "Active" | "On Leave" | "Inactive";
  avatar: string;
  joinDate: string;
  projectsAssigned: number;
};

export const employees: Employee[] = [
  { id: "emp1", name: "Sarah Chen", email: "sarah@crmpro.com", phone: "+1 555-0201", department: "Engineering", role: "Senior Developer", status: "Active", avatar: "SC", joinDate: "2024-06-15", projectsAssigned: 3 },
  { id: "emp2", name: "Alex Turner", email: "alex@crmpro.com", phone: "+1 555-0202", department: "Engineering", role: "Full Stack Developer", status: "Active", avatar: "AT", joinDate: "2024-09-01", projectsAssigned: 2 },
  { id: "emp3", name: "Mike Johnson", email: "mike@crmpro.com", phone: "+1 555-0203", department: "Design", role: "UI/UX Designer", status: "Active", avatar: "MJ", joinDate: "2025-01-10", projectsAssigned: 2 },
  { id: "emp4", name: "Emily Davis", email: "emily@crmpro.com", phone: "+1 555-0204", department: "Marketing", role: "Marketing Manager", status: "Active", avatar: "ED", joinDate: "2025-03-22", projectsAssigned: 1 },
  { id: "emp5", name: "Tom Wilson", email: "tom@crmpro.com", phone: "+1 555-0205", department: "Engineering", role: "Backend Developer", status: "On Leave", avatar: "TW", joinDate: "2024-11-05", projectsAssigned: 2 },
  { id: "emp6", name: "Lisa Park", email: "lisa@crmpro.com", phone: "+1 555-0206", department: "Sales", role: "Sales Representative", status: "Active", avatar: "LP", joinDate: "2025-06-18", projectsAssigned: 1 },
  { id: "emp7", name: "James Rodriguez", email: "james@crmpro.com", phone: "+1 555-0207", department: "HR", role: "HR Coordinator", status: "Active", avatar: "JR", joinDate: "2025-08-01", projectsAssigned: 0 },
  { id: "emp8", name: "Nina Patel", email: "nina@crmpro.com", phone: "+1 555-0208", department: "Design", role: "Graphic Designer", status: "Inactive", avatar: "NP", joinDate: "2024-04-12", projectsAssigned: 0 },
];

// Chat
export type ChatContact = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  online: boolean;
  unread: number;
};

export const chatContacts: ChatContact[] = [
  { id: "cc1", name: "Sarah Chen", avatar: "SC", lastMessage: "Sure, I'll send the update", lastMessageTime: "2m ago", online: true, unread: 2 },
  { id: "cc2", name: "Alex Turner", avatar: "AT", lastMessage: "The API is ready for testing", lastMessageTime: "15m ago", online: true, unread: 0 },
  { id: "cc3", name: "Mike Johnson", avatar: "MJ", lastMessage: "Can you review the mockups?", lastMessageTime: "1h ago", online: false, unread: 1 },
  { id: "cc4", name: "Emily Davis", avatar: "ED", lastMessage: "Meeting at 3 PM confirmed", lastMessageTime: "3h ago", online: true, unread: 0 },
  { id: "cc5", name: "Tom Wilson", avatar: "TW", lastMessage: "I'll be out next week", lastMessageTime: "5h ago", online: false, unread: 0 },
  { id: "cc6", name: "Lisa Park", avatar: "LP", lastMessage: "New lead from the conference", lastMessageTime: "1d ago", online: false, unread: 0 },
];

export type ChatMessage = {
  id: string;
  contactId: string;
  text: string;
  sender: "me" | "them";
  time: string;
};

export const chatMessages: ChatMessage[] = [
  { id: "cm1", contactId: "cc1", text: "Hey Sarah, how's the landing page coming along?", sender: "me", time: "10:30 AM" },
  { id: "cm2", contactId: "cc1", text: "Going great! Almost done with the hero section", sender: "them", time: "10:32 AM" },
  { id: "cm3", contactId: "cc1", text: "Can you share a preview by EOD?", sender: "me", time: "10:33 AM" },
  { id: "cm4", contactId: "cc1", text: "Sure, I'll send the update", sender: "them", time: "10:35 AM" },
  { id: "cm5", contactId: "cc2", text: "Alex, is the authentication API ready?", sender: "me", time: "9:15 AM" },
  { id: "cm6", contactId: "cc2", text: "Yes! Just finished testing. All endpoints are working", sender: "them", time: "9:20 AM" },
  { id: "cm7", contactId: "cc2", text: "The API is ready for testing", sender: "them", time: "9:22 AM" },
  { id: "cm8", contactId: "cc3", text: "Mike, the new mockups look amazing!", sender: "me", time: "Yesterday" },
  { id: "cm9", contactId: "cc3", text: "Thanks! Can you review the mockups?", sender: "them", time: "Yesterday" },
];

// Time Tracking
export type TimeEntry = {
  id: string;
  task: string;
  project: string;
  member: string;
  hours: number;
  billable: boolean;
  date: string;
};

export const timeEntries: TimeEntry[] = [
  { id: "te1", task: "Landing page design", project: "Website Redesign", member: "Sarah Chen", hours: 4, billable: true, date: "2026-03-07" },
  { id: "te2", task: "OAuth implementation", project: "Mobile App v2", member: "Alex Turner", hours: 6, billable: true, date: "2026-03-07" },
  { id: "te3", task: "API documentation", project: "CRM Integration", member: "Mike Johnson", hours: 3, billable: false, date: "2026-03-07" },
  { id: "te4", task: "Bug fixes", project: "Website Redesign", member: "Tom Wilson", hours: 5, billable: true, date: "2026-03-06" },
  { id: "te5", task: "CI/CD setup", project: "Mobile App v2", member: "Lisa Park", hours: 7, billable: true, date: "2026-03-06" },
  { id: "te6", task: "User research", project: "E-commerce Platform", member: "Emily Davis", hours: 4, billable: false, date: "2026-03-05" },
  { id: "te7", task: "Database queries", project: "Data Analytics Dashboard", member: "Alex Turner", hours: 5, billable: true, date: "2026-03-05" },
  { id: "te8", task: "Payment integration", project: "E-commerce Platform", member: "Tom Wilson", hours: 8, billable: true, date: "2026-03-04" },
  { id: "te9", task: "Code review", project: "Website Redesign", member: "Sarah Chen", hours: 2, billable: false, date: "2026-03-04" },
  { id: "te10", task: "Sprint planning", project: "Mobile App v2", member: "Mike Johnson", hours: 1.5, billable: false, date: "2026-03-03" },
];
