const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建订单
 */
const createOrder = async (customerId, items, userId, notes = '') => {
  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 创建订单
    const orderQuery = `
      INSERT INTO orders (id, order_number, customer_id, sales_person_id, status, notes)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *;
    `;
    const orderResult = await client.query(orderQuery, [
      orderId,
      orderNumber,
      customerId,
      userId,
      notes,
    ]);

    // 创建订单项
    const orderItems = [];
    for (const item of items) {
      const itemId = uuidv4();
      const itemQuery = `
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *;
      `;
      const itemResult = await client.query(itemQuery, [
        itemId,
        orderId,
        item.product_id,
        item.quantity,
        item.unit_price,
      ]);
      orderItems.push(itemResult.rows[0]);
    }

    // 创建仓库拣货任务
    const taskId = uuidv4();
    const taskQuery = `
      INSERT INTO warehouse_tasks (id, order_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING *;
    `;
    const taskResult = await client.query(taskQuery, [taskId, orderId]);

    // 为每个订单项创建拣货任务项
    for (const item of orderItems) {
      const taskItemId = uuidv4();
      const taskItemQuery = `
        INSERT INTO warehouse_task_items (id, warehouse_task_id, order_item_id, quantity_required)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      await client.query(taskItemQuery, [taskItemId, taskId, item.id, item.quantity]);
    }

    await client.query('COMMIT');

    return {
      order: orderResult.rows[0],
      items: orderItems,
      task: taskResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 根据 ID 获取订单
 */
const getOrderById = async (id) => {
  const query = `
    SELECT 
      o.*, 
      c.name as customer_name,
      c.phone as customer_phone,
      u.username as sales_person_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.sales_person_id = u.id
    WHERE o.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 获取订单详情（包括项目）
 */
const getOrderWithItems = async (id) => {
  const order = await getOrderById(id);
  
  if (!order) return null;

  const itemsQuery = `
    SELECT 
      oi.*,
      p.sku,
      p.name as product_name,
      p.unit
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `;
  const itemsResult = await pool.query(itemsQuery, [id]);

  return {
    ...order,
    items: itemsResult.rows,
  };
};

/**
 * 获取所有订单
 */
const getAllOrders = async (filters = {}, limit = 50, offset = 0) => {
  let query = `
    SELECT 
      o.*,
      c.name as customer_name,
      u.username as sales_person_name,
      COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.sales_person_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 1=1
  `;

  const values = [];
  let paramCount = 1;

  // 添加过滤条件
  if (filters.status) {
    query += ` AND o.status = $${paramCount}`;
    values.push(filters.status);
    paramCount++;
  }

  if (filters.customer_id) {
    query += ` AND o.customer_id = $${paramCount}`;
    values.push(filters.customer_id);
    paramCount++;
  }

  if (filters.from_date) {
    query += ` AND o.created_at >= $${paramCount}`;
    values.push(filters.from_date);
    paramCount++;
  }

  if (filters.to_date) {
    query += ` AND o.created_at <= $${paramCount}`;
    values.push(filters.to_date);
    paramCount++;
  }

  query += ` GROUP BY o.id, c.name, u.username`;
  query += ` ORDER BY o.created_at DESC`;
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * 更新订单状态
 */
const updateOrderStatus = async (id, status) => {
  const query = `
    UPDATE orders
    SET status = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id, status]);
  return result.rows[0];
};

/**
 * 更新订单总重量
 */
const updateOrderTotalWeight = async (id) => {
  const query = `
    UPDATE orders
    SET total_weight = (
      SELECT COALESCE(SUM(weight), 0) FROM order_items WHERE order_id = $1
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createOrder,
  getOrderById,
  getOrderWithItems,
  getAllOrders,
  updateOrderStatus,
  updateOrderTotalWeight,
};
