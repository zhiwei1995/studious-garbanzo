const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建产品
 */
const createProduct = async (productData) => {
  const id = uuidv4();
  const {
    sku,
    name,
    description,
    unit,
    production_department,
    standard_weight,
  } = productData;

  const query = `
    INSERT INTO products (id, sku, name, description, unit, production_department, standard_weight)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [id, sku, name, description, unit, production_department, standard_weight];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('SKU already exists');
    }
    throw error;
  }
};

/**
 * 根据 ID 获取产品
 */
const getProductById = async (id) => {
  const query = 'SELECT * FROM products WHERE id = $1 AND is_active = true';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 根据 SKU 获取产品
 */
const getProductBySku = async (sku) => {
  const query = 'SELECT * FROM products WHERE sku = $1 AND is_active = true';
  const result = await pool.query(query, [sku]);
  return result.rows[0];
};

/**
 * 获取所有产品
 */
const getAllProducts = async (limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM products
    WHERE is_active = true
    ORDER BY name ASC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

/**
 * 更新产品
 */
const updateProduct = async (id, productData) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(productData).forEach((key) => {
    if (key !== 'id') {
      updates.push(`${key} = $${paramCount}`);
      values.push(productData[key]);
      paramCount++;
    }
  });

  values.push(id);

  const query = `
    UPDATE products
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * 删除产品（逻辑删除）
 */
const deleteProduct = async (id) => {
  const query = `
    UPDATE products
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 初始化产品库存
 */
const initializeInventory = async (productId, warehouseLocation, quantity) => {
  const id = uuidv4();
  const query = `
    INSERT INTO inventory (id, product_id, warehouse_location, quantity_available)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (product_id, warehouse_location)
    DO UPDATE SET quantity_available = quantity_available + $4
    RETURNING *;
  `;

  const result = await pool.query(query, [id, productId, warehouseLocation, quantity]);
  return result.rows[0];
};

/**
 * 获取产品库存
 */
const getProductInventory = async (productId) => {
  const query = `
    SELECT * FROM inventory
    WHERE product_id = $1
    ORDER BY warehouse_location ASC
  `;
  const result = await pool.query(query, [productId]);
  return result.rows;
};

/**
 * 获取库存总量
 */
const getProductTotalQuantity = async (productId) => {
  const query = `
    SELECT 
      COALESCE(SUM(quantity_available), 0) as total_available,
      COALESCE(SUM(quantity_reserved), 0) as total_reserved
    FROM inventory
    WHERE product_id = $1
  `;
  const result = await pool.query(query, [productId]);
  return result.rows[0];
};

module.exports = {
  createProduct,
  getProductById,
  getProductBySku,
  getAllProducts,
  updateProduct,
  deleteProduct,
  initializeInventory,
  getProductInventory,
  getProductTotalQuantity,
};
