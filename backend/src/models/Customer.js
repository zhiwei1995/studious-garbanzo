const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建客户
 */
const createCustomer = async (customerData) => {
  const id = uuidv4();
  const {
    name,
    phone,
    email,
    address,
    city,
    province,
    postal_code,
    notes,
  } = customerData;

  const query = `
    INSERT INTO customers (id, name, phone, email, address, city, province, postal_code, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [id, name, phone, email, address, city, province, postal_code, notes];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * 根据 ID 获取客户
 */
const getCustomerById = async (id) => {
  const query = 'SELECT * FROM customers WHERE id = $1 AND is_active = true';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 根据名称搜索客户
 */
const searchCustomers = async (name, limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM customers
    WHERE is_active = true AND name ILIKE $1
    ORDER BY name ASC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [`%${name}%`, limit, offset]);
  return result.rows;
};

/**
 * 获取所有客户
 */
const getAllCustomers = async (limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM customers
    WHERE is_active = true
    ORDER BY name ASC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

/**
 * 更新客户
 */
const updateCustomer = async (id, customerData) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(customerData).forEach((key) => {
    if (key !== 'id') {
      updates.push(`${key} = $${paramCount}`);
      values.push(customerData[key]);
      paramCount++;
    }
  });

  values.push(id);

  const query = `
    UPDATE customers
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * 删除客户（逻辑删除）
 */
const deleteCustomer = async (id) => {
  const query = `
    UPDATE customers
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createCustomer,
  getCustomerById,
  searchCustomers,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
};
