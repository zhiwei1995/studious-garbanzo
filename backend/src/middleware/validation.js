const Joi = require('joi');

/**
 * 创建订单验证
 */
const createOrderSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      unit_price: Joi.number().positive().required(),
    })
  ).min(1).required(),
  notes: Joi.string().max(500),
});

/**
 * 用户注册验证
 */
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(255),
  phone: Joi.string().max(20),
  role: Joi.string().valid('admin', 'sales', 'warehouse_staff', 'production_staff', 'finance_staff').required(),
  department: Joi.string().max(100),
});

/**
 * 用户登录验证
 */
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * 产品创建验证
 */
const createProductSchema = Joi.object({
  sku: Joi.string().max(100).required(),
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1000),
  unit: Joi.string().max(50),
  production_department: Joi.string().max(100),
  standard_weight: Joi.number().positive(),
});

/**
 * 客户创建验证
 */
const createCustomerSchema = Joi.object({
  name: Joi.string().max(255).required(),
  phone: Joi.string().max(20),
  email: Joi.string().email(),
  address: Joi.string().max(500),
  city: Joi.string().max(100),
  province: Joi.string().max(100),
  postal_code: Joi.string().max(20),
  notes: Joi.string().max(500),
});

/**
 * 验证中间件工厂
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: messages,
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = {
  validate,
  createOrderSchema,
  registerSchema,
  loginSchema,
  createProductSchema,
  createCustomerSchema,
};
