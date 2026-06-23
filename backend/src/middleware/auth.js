const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * 认证中间件
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * 角色权限检查中间件
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
};

/**
 * 部门权限检查中间件
 */
const authorizeDepartment = (allowedDepartments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedDepartments.includes(req.user.department)) {
      return res.status(403).json({ error: 'Department not authorized' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeDepartment,
};
