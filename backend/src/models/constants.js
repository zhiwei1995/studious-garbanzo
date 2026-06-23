/**
 * 订单状态枚举
 */
const ORDER_STATUS = {
  PENDING: 'pending',           // 待处理
  PICKING: 'picking',           // 拣货中
  INCOMPLETE_PARTS: 'incomplete_parts', // 有缺货，部分在生产
  PRODUCTION: 'production',     // 生产中
  WEIGHING: 'weighing',         // 称重中
  COMPLETED: 'completed',       // 完成拣货
  INVOICED: 'invoiced',         // 已开发票
  SHIPPED: 'shipped',           // 已发货
};

/**
 * Warehouse Task 状态
 */
const WAREHOUSE_TASK_STATUS = {
  PENDING: 'pending',           // 待处理
  IN_PROGRESS: 'in_progress',   // 拣货中
  COMPLETED: 'completed',       // 完成
};

/**
 * Production Order 状态
 */
const PRODUCTION_ORDER_STATUS = {
  PENDING: 'pending',           // 待生产
  IN_PROGRESS: 'in_progress',   // 生产中
  COMPLETED: 'completed',       // 完成
};

/**
 * Invoice 状态
 */
const INVOICE_STATUS = {
  DRAFT: 'draft',               // 草稿
  ISSUED: 'issued',             // 已开具
  PAID: 'paid',                 // 已付款
};

/**
 * 部门列表
 */
const DEPARTMENTS = {
  WAREHOUSE: 'warehouse',
  PRODUCTION_A: 'production_a',
  PRODUCTION_B: 'production_b',
  PRODUCTION_C: 'production_c',
  FINANCE: 'finance',
};

/**
 * 用户角色
 */
const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  WAREHOUSE_STAFF: 'warehouse_staff',
  PRODUCTION_STAFF: 'production_staff',
  FINANCE_STAFF: 'finance_staff',
};

module.exports = {
  ORDER_STATUS,
  WAREHOUSE_TASK_STATUS,
  PRODUCTION_ORDER_STATUS,
  INVOICE_STATUS,
  DEPARTMENTS,
  USER_ROLES,
};
