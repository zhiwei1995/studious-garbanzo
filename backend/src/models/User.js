const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * 创建用户
 */
const createUser = async (userData) => {
  const {
    username,
    email,
    password,
    role,
    department,
    name,
    phone,
  } = userData;

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO users (id, username, email, password_hash, role, department, name, phone)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, username, email, role, department, name, phone, created_at;
  `;

  const values = [id, username, email, passwordHash, role, department, name, phone];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
};

/**
 * 根据用户名获取用户
 */
const getUserByUsername = async (username) => {
  const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
  const result = await pool.query(query, [username]);
  return result.rows[0];
};

/**
 * 根据 ID 获取用户
 */
const getUserById = async (id) => {
  const query = 'SELECT id, username, email, role, department, name, phone, created_at FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 获取所有用户
 */
const getAllUsers = async (limit = 50, offset = 0) => {
  const query = `
    SELECT id, username, email, role, department, name, phone, is_active, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

/**
 * 更新用户
 */
const updateUser = async (id, userData) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.keys(userData).forEach((key) => {
    if (key !== 'id' && key !== 'password_hash') {
      updates.push(`${key} = $${paramCount}`);
      values.push(userData[key]);
      paramCount++;
    }
  });

  values.push(id);

  const query = `
    UPDATE users
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING id, username, email, role, department, name, phone, is_active, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * 删除用户（逻辑删除）
 */
const deleteUser = async (id) => {
  const query = `
    UPDATE users
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

/**
 * 比较密码
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  comparePassword,
};
