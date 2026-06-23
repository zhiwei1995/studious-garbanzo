-- ============================================
-- 用户和权限管理
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, sales, warehouse_staff, production_staff, finance_staff
  department VARCHAR(100),
  name VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 客户管理
-- ============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name);

-- ============================================
-- 产品管理
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50), -- 单位：个、kg、L等
  production_department VARCHAR(100), -- 该产品由哪个部门生产
  standard_weight DECIMAL(10, 2), -- 标准重量
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);

-- ============================================
-- 库存管理
-- ============================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_location VARCHAR(255), -- 仓库位置编码
  quantity_available INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE UNIQUE INDEX idx_inventory_location ON inventory(product_id, warehouse_location);

-- ============================================
-- 订单管理
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  sales_person_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, picking, incomplete_parts, production, weighing, completed, invoiced, shipped
  total_weight DECIMAL(10, 2), -- 最终重量（称重后）
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================
-- 订单项（订单中的每一项商品）
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  weight DECIMAL(10, 2), -- 实际重量（拣货后称重）
  unit_price DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, picked, incomplete, in_production, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- 仓库拣货任务
-- ============================================

CREATE TABLE warehouse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  warehouse_staff_id UUID REFERENCES users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_tasks_order ON warehouse_tasks(order_id);
CREATE INDEX idx_warehouse_tasks_status ON warehouse_tasks(status);
CREATE INDEX idx_warehouse_tasks_staff ON warehouse_tasks(warehouse_staff_id);

-- ============================================
-- 拣货详情（warehouse_tasks 的每一项）
-- ============================================

CREATE TABLE warehouse_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_task_id UUID NOT NULL REFERENCES warehouse_tasks(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  quantity_required INT NOT NULL,
  quantity_available INT DEFAULT 0,
  quantity_missing INT DEFAULT 0, -- 缺货数量
  is_available BOOLEAN DEFAULT false, -- 是否有货
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_task_items_task ON warehouse_task_items(warehouse_task_id);
CREATE INDEX idx_warehouse_task_items_order_item ON warehouse_task_items(order_item_id);

-- ============================================
-- 生产订单（缺货项需要生产）
-- ============================================

CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_number VARCHAR(50) UNIQUE NOT NULL,
  origin_order_id UUID REFERENCES orders(id),
  assigned_department VARCHAR(100) NOT NULL, -- production_a, production_b, etc.
  assigned_staff_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_orders_origin ON production_orders(origin_order_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_department ON production_orders(assigned_department);

-- ============================================
-- 生产订单项
-- ============================================

CREATE TABLE production_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  quantity_required INT NOT NULL,
  quantity_produced INT DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_order_items_production ON production_order_items(production_order_id);
CREATE INDEX idx_production_order_items_order_item ON production_order_items(order_item_id);

-- ============================================
-- 生产过程记录（包括 waste）
-- ============================================

CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id),
  production_order_item_id UUID REFERENCES production_order_items(id),
  log_type VARCHAR(50) NOT NULL, -- raw_material_taken, production_started, production_completed, waste_recorded
  quantity INT,
  waste_quantity INT, -- 浪费数量
  waste_reason VARCHAR(255), -- 浪费原因
  notes TEXT,
  staff_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_logs_production_order ON production_logs(production_order_id);

-- ============================================
-- 称重记录
-- ============================================

CREATE TABLE weighing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  weight DECIMAL(10, 2) NOT NULL,
  warehouse_staff_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weighing_records_order ON weighing_records(order_id);
CREATE INDEX idx_weighing_records_order_item ON weighing_records(order_item_id);

-- ============================================
-- 发票
-- ============================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  finance_staff_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, issued, paid
  subtotal DECIMAL(12, 2),
  tax DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  issued_at TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ============================================
-- 发票项
-- ============================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  quantity INT NOT NULL,
  weight DECIMAL(10, 2), -- 实际重量
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================
-- 运输管理
-- ============================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  invoice_id UUID REFERENCES invoices(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_transit, delivered
  carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_invoice ON shipments(invoice_id);
CREATE INDEX idx_shipments_status ON shipments(status);

-- ============================================
-- 审计日志
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
