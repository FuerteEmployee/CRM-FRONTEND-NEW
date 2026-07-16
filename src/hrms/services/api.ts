/** Central API Registry **/
export * from "./authService";
// export * from "./leadService"; (missing)
// export * from "./followUpService"; (missing)
// export * from "./productService"; (missing) // brandService & categoryService still used
export * from "./userService";
// export * from "./inventoryService"; (missing)
// export * from "./orderService"; (missing)
export * from "./notificationService";
// export * from "./supportService"; (missing)
// export * from "./installationService"; (missing)
// export * from "./warrantyService"; (missing)
// export * from "./financialService"; (missing)
export * from "./hrService";
export * from "./analyticsService";
// export * from "./marketingService"; (missing)
// export * from "./schemeService"; (missing)
export * from "./trainingService";
// export * from "./quotationService"; (missing)
export * from "./checklistService";
// export * from "./accountGroupService"; (missing)
// export * from "./accountMasterService"; (missing)
// // export * from "./supplierService"; (missing)
// export * from "./supplierCategoryService"; (missing)
// export * from "./dealerService"; (missing)
// export * from "./financierService"; (missing)
// export * from "./customerCategoryService"; (missing)
// export * from "./modelClassService"; (missing)
// export * from "./hsnSacService"; (missing)
// export * from "./productMasterService"; (missing)
export * from "./systemSettingsService";
export * from "./departmentService";
export * from "./designationService";
export * from "./shiftService";
// export * from "./purchaseService"; (missing)
export * from "./apiUtils";
// export * from "./reminderService"; (missing)
export * from "./targetService";
// export * from "./salesDcService"; (missing)
// export * from "./warrantyComponentService"; (missing)
// export * from "./warrantyConditionService"; (missing)
// export * from "./serviceTaskService"; (missing)
// export * from "./servicePlanService"; (missing)
export * from "./todoService";


// Re-export specific names as they were used before to avoid breakage 
import { authService as authApi } from "./authService";
// import { leadService as customerApi } from "./leadService";
const customerApi = {} as any;
// import { followUpService as followUpApi } from "./followUpService";
const followUpApi = {} as any;
// import { brandService as brandApi, categoryService as categoryApi } from "./productService";
const brandApi = {} as any;
const categoryApi = {} as any;
import { userService as userApi } from "./userService";
// import { stockService as stockApi, inventoryService as inventoryApi } from "./inventoryService";
const stockApi = {} as any;
const inventoryApi = {} as any;
// import { invoiceService as invoiceApi, onlineOrderService as onlineOrderApi, salesOrderService as salesOrderApi } from "./orderService";
const invoiceApi = {} as any;
const onlineOrderApi = {} as any;
const salesOrderApi = {} as any;
import { notificationService as notificationApi } from "./notificationService";
// import { supportService as serviceApi } from "./supportService";
const serviceApi = {} as any;
// import { installationService as installationApi } from "./installationService";
const installationApi = {} as any;
// import { warrantyService as warrantyApi } from "./warrantyService";
const warrantyApi = {} as any;
// import { financialService as collectionApi } from "./financialService";
const collectionApi = {} as any;
import { employeeService as employeeApi } from "./hrService";
import { analyticsService as analyticsApi } from "./analyticsService";
// import { marketingService as marketingApi } from "./marketingService";
const marketingApi = {} as any;
// import { schemeService as schemeApi } from "./schemeService";
const schemeApi = {} as any;
import { trainingService as trainingApi } from "./trainingService";
// import { quotationService as quotationApi } from "./quotationService";
const quotationApi = {} as any;
// import { salesReturnService as salesReturnApi } from "./salesReturnService";
const salesReturnApi = {} as any;

import { storeService as storeApi } from "./storeService";
import { checklistService as checklistApi } from "./checklistService";
// import { accountGroupService as accountGroupApi } from "./accountGroupService";
const accountGroupApi = {} as any;
// import { supplierService as supplierApi } from "./supplierService";
const supplierApi = {} as any;
// import { supplierCategoryService as supplierCategoryApi } from "./supplierCategoryService";
const supplierCategoryApi = {} as any;
// import { dealerService as dealerApi } from "./dealerService";
const dealerApi = {} as any;
// import { financierService as financierApi } from "./financierService";
const financierApi = {} as any;
// import { itemMasterService as itemMasterApi } from "./itemMasterService";
const itemMasterApi = {} as any;
// import { customerMasterService as customerMasterApi } from "./customerMasterService";
const customerMasterApi = {} as any;
// import { customerCategoryApi } from "./customerCategoryService";
const customerCategoryApi = {} as any;
// import { modelClassService as modelClassApi } from "./modelClassService";
const modelClassApi = {} as any;
// import { hsnSacService as hsnSacApi } from "./hsnSacService";
const hsnSacApi = {} as any;
// import { productMasterApi } from "./productMasterService";
const productMasterApi = {} as any;
import { settingsService as settingsApi } from "./systemSettingsService";
import { departmentService as departmentApi } from "./departmentService";
// import { purchaseService as purchaseApi } from "./purchaseService";
const purchaseApi = {} as any;
// import { reminderService as reminderApi } from "./reminderService";
const reminderApi = {} as any;
import { targetService as targetApi } from "./targetService";
// import { salesDcService as salesDcApi } from "./salesDcService";
const salesDcApi = {} as any;
// import { warrantyComponentService as warrantyComponentApi } from "./warrantyComponentService";
const warrantyComponentApi = {} as any;
// import { warrantyConditionService as warrantyConditionApi } from "./warrantyConditionService";
const warrantyConditionApi = {} as any;
// import { serviceTaskService as serviceTaskApi } from "./serviceTaskService";
const serviceTaskApi = {} as any;
// import { servicePlanService as servicePlanApi } from "./servicePlanService";
const servicePlanApi = {} as any;
import { todoService as todoApi } from "./todoService";

export {
  authApi,
  storeApi,
  customerApi,
  followUpApi,
  brandApi,
  categoryApi,
  userApi,
  stockApi,
  inventoryApi,
  invoiceApi,
  onlineOrderApi,
  salesOrderApi,
  notificationApi,
  serviceApi,
  installationApi,
  warrantyApi,
  collectionApi,
  employeeApi,
  analyticsApi,
  marketingApi,
  schemeApi,
  trainingApi,
  quotationApi,
  salesReturnApi,
  checklistApi,
  accountGroupApi,
  supplierApi,
  supplierCategoryApi,
  financierApi,
  itemMasterApi,
  customerMasterApi,
  customerCategoryApi,
  modelClassApi,
  hsnSacApi,
  productMasterApi,
  settingsApi,
  departmentApi,
  dealerApi,
  purchaseApi,
  reminderApi,
  targetApi,
  salesDcApi,
  warrantyComponentApi,
  warrantyConditionApi,
  serviceTaskApi,
  servicePlanApi,
  todoApi,
};

