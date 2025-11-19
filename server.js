const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Armazenamento em memória
const notifications = [];
const users = new Map();
const rooms = new Map();

// ======= FUNÇÕES AUXILIARES =======

function createNotification(data) {
  return {
    id: uuidv4(),
    title: data.title || 'Notificação',
    message: data.message || '',
    type: data.type || 'info', // info, success, warning, error
    priority: data.priority || 'normal', // low, normal, high, urgent
    room: data.room || 'global',
    sender: data.sender || 'System',
    timestamp: new Date().toISOString(),
    read: false
  };
}

function getNotificationsByRoom(room = 'global', limit = 50) {
  return notifications
    .filter(n => n.room === room)
    .slice(-limit)
    .reverse();
}

function getUserStats(userId) {
  const userNotifications = notifications.filter(n => 
    users.get(userId)?.rooms.includes(n.room)
  );
  
  return {
    total: userNotifications.length,
    unread: userNotifications.filter(n => !n.read).length,
    byType: {
      info: userNotifications.filter(n => n.type === 'info').length,
      success: userNotifications.filter(n => n.type === 'success').length,
      warning: userNotifications.filter(n => n.type === 'warning').length,
      error: userNotifications.filter(n => n.type === 'error').length
    }
  };
}

// ======= ROTAS HTTP =======

app.get('/', (req, res) => {
  res.json({
    message: 'Real-Time Notification System',
    version: '1.0.0',
    active_connections: io.engine.clientsCount,
    total_notifications: notifications.length,
    endpoints: {
      'POST /api/notify': 'Enviar notificação',
      'POST /api/notify/broadcast': 'Broadcast para todos',
      'GET /api/notifications': 'Listar notificações',
      'GET /api/stats': 'Estatísticas do sistema',
      'DELETE /api/notifications/:id': 'Deletar notificação'
    },
    websocket: {
      endpoint: `ws://localhost:${PORT}`,
      events: {
        connection: 'Conexão estabelecida',
        notification: 'Nova notificação',
        join_room: 'Entrar em sala',
        leave_room: 'Sair de sala'
      }
    }
  });
});

// Enviar notificação para uma sala específica
app.post('/api/notify', (req, res) => {
  try {
    const notification = createNotification(req.body);
    notifications.push(notification);

    // Emitir para a sala específica
    io.to(notification.room).emit('notification', notification);

    res.status(201).json({
      success: true,
      notification: notification
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao enviar notificação',
      message: error.message 
    });
  }
});

// Broadcast para todos os usuários
app.post('/api/notify/broadcast', (req, res) => {
  try {
    const notification = createNotification({
      ...req.body,
      room: 'global'
    });
    
    notifications.push(notification);
    io.emit('notification', notification);

    res.status(201).json({
      success: true,
      notification: notification,
      broadcast: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao enviar broadcast',
      message: error.message 
    });
  }
});

// Listar notificações
app.get('/api/notifications', (req, res) => {
  const room = req.query.room || 'global';
  const limit = parseInt(req.query.limit) || 50;
  const type = req.query.type;

  let filteredNotifications = getNotificationsByRoom(room, limit);

  if (type) {
    filteredNotifications = filteredNotifications.filter(n => n.type === type);
  }

  res.json({
    total: filteredNotifications.length,
    room: room,
    notifications: filteredNotifications
  });
});

// Estatísticas do sistema
app.get('/api/stats', (req, res) => {
  const notificationsByType = {
    info: notifications.filter(n => n.type === 'info').length,
    success: notifications.filter(n => n.type === 'success').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    error: notifications.filter(n => n.type === 'error').length
  };

  const notificationsByRoom = {};
  notifications.forEach(n => {
    notificationsByRoom[n.room] = (notificationsByRoom[n.room] || 0) + 1;
  });

  res.json({
    total_notifications: notifications.length,
    active_connections: io.engine.clientsCount,
    registered_users: users.size,
    active_rooms: rooms.size,
    notifications_by_type: notificationsByType,
    notifications_by_room: notificationsByRoom
  });
});

// Deletar notificação
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const index = notifications.findIndex(n => n.id === id);

  if (index === -1) {
    return res.status(404).json({ 
      error: 'Notificação não encontrada' 
    });
  }

  notifications.splice(index, 1);

  res.json({
    success: true,
    message: 'Notificação deletada',
    id: id
  });
});

// Limpar notificações antigas
app.post('/api/cleanup', (req, res) => {
  const daysAgo = parseInt(req.body.days) || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  const initialCount = notifications.length;
  
  for (let i = notifications.length - 1; i >= 0; i--) {
    const notifDate = new Date(notifications[i].timestamp);
    if (notifDate < cutoffDate) {
      notifications.splice(i, 1);
    }
  }

  const deleted = initialCount - notifications.length;

  res.json({
    success: true,
    deleted: deleted,
    remaining: notifications.length
  });
});

// ======= WEBSOCKET =======

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  // Registrar usuário
  socket.on('register', (data) => {
    const userId = data.userId || socket.id;
    users.set(userId, {
      socketId: socket.id,
      rooms: ['global'],
      connectedAt: new Date().toISOString()
    });

    socket.join('global');

    socket.emit('registered', {
      userId: userId,
      socketId: socket.id,
      message: 'Registrado com sucesso'
    });

    console.log(`👤 Usuário registrado: ${userId}`);
  });

  // Entrar em sala
  socket.on('join_room', (data) => {
    const room = data.room;
    socket.join(room);

    // Atualizar usuário
    for (const [userId, user] of users.entries()) {
      if (user.socketId === socket.id) {
        user.rooms.push(room);
        break;
      }
    }

    // Atualizar contagem de sala
    rooms.set(room, (rooms.get(room) || 0) + 1);

    socket.emit('room_joined', {
      room: room,
      message: `Você entrou na sala: ${room}`
    });

    // Notificar outros na sala
    socket.to(room).emit('user_joined', {
      room: room,
      socketId: socket.id
    });

    console.log(`📫 ${socket.id} entrou na sala: ${room}`);
  });

  // Sair de sala
  socket.on('leave_room', (data) => {
    const room = data.room;
    socket.leave(room);

    // Atualizar usuário
    for (const [userId, user] of users.entries()) {
      if (user.socketId === socket.id) {
        user.rooms = user.rooms.filter(r => r !== room);
        break;
      }
    }

    // Atualizar contagem de sala
    const roomCount = rooms.get(room) || 0;
    if (roomCount > 0) {
      rooms.set(room, roomCount - 1);
    }

    socket.emit('room_left', {
      room: room,
      message: `Você saiu da sala: ${room}`
    });

    console.log(`📪 ${socket.id} saiu da sala: ${room}`);
  });

  // Marcar notificação como lida
  socket.on('mark_read', (data) => {
    const notification = notifications.find(n => n.id === data.id);
    if (notification) {
      notification.read = true;
      socket.emit('notification_updated', notification);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    // Remover usuário
    for (const [userId, user] of users.entries()) {
      if (user.socketId === socket.id) {
        users.delete(userId);
        break;
      }
    }

    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// ======= INICIALIZAÇÃO =======

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`📊 Dashboard em http://localhost:${PORT}`);
});
