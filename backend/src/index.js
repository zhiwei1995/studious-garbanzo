const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Socket.io 实时通信设置
// ============================================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 加入特定房间（如 warehouse, production_a 等）
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // 离开房间
  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`User ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 导出 io 供路由使用
app.set('io', io);

// ============================================
// API 路由
// ============================================

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 用户认证路由（待开发）
app.use('/api/auth', require('./routes/auth'));

// 订单路由（待开发）
app.use('/api/orders', require('./routes/orders'));

// 仓库路由（待开发）
app.use('/api/warehouse', require('./routes/warehouse'));

// 生产路由（待开发）
app.use('/api/production', require('./routes/production'));

// 财务路由（待开发）
app.use('/api/finance', require('./routes/finance'));

// 产品和库存路由（待开发）
app.use('/api/products', require('./routes/products'));

// 用户管理路由（待开发）
app.use('/api/users', require('./routes/users'));

// ============================================
// 错误处理中间件
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ============================================
// 启动服务器
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
