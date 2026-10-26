// "Salary Managed By" / "Managing Branch" on both staff edit forms is fixed
// on for these companies only (Trinetra / Rudraverse, owner
// info@trinetratechnoworld.com) — not a super-admin add-on.
// Must match CRM-BACKEND/src/hrms/utils/branchManagingCompany.js.

export const BRANCH_SALARY_TENANT_IDS = ["6a644ea61aa686e76f53d7a2"];

export const hasBranchSalaryManagement = (user: any): boolean => {
  const tenantId = user?.tenant?._id || user?.tenant_id?._id || user?.tenant_id;
  return !!tenantId && BRANCH_SALARY_TENANT_IDS.includes(String(tenantId));
};
