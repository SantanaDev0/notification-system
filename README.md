# 📬 Real-Time Notification System

Sistema de notificações em tempo real usando WebSocket (Socket.IO) com suporte para salas, tipos de notificações e estatísticas.

## 🚀 Funcionalidades

- ✅ Notificações em tempo real via WebSocket
- ✅ Sistema de salas (rooms) para notificações segmentadas
- ✅ 4 tipos de notificações (info, success, warning, error)
- ✅ Níveis de prioridade
- ✅ Rastreamento de leitura
- ✅ Estatísticas em tempo real
- ✅ Interface web de demonstração
- ✅ API REST completa
- ✅ Broadcast para todos os usuários
- ✅ Persistência em memória

## 📦 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.IO** - WebSocket em tempo real
- **UUID** - Geração de IDs únicos

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/notification-system.git

# Entre no diretório
cd notification-system

# Instale as dependências
npm install

# Inicie o servidor
npm start
```

Acesse: `http://localhost:3000`

## 🔧 Configuração

Crie um arquivo `.env`:

```env
PORT=3000
```

## 📚 API REST

### `POST /api/notify`
Enviar notificação para uma sala específica

**Body:**
```json
{
  "title": "Nova Mensagem",
  "message": "Você tem uma nova mensagem!",
  "type": "info",
  "priority": "normal",
  "room": "global",
  "sender": "System"
}
```

**Tipos:** `info`, `success`, `warning`, `error`  
**Prioridades:** `low`, `normal`, `high`, `urgent`

### `POST /api/notify/broadcast`
Enviar notificação para todos os usuários conectados

**Body:**
```json
{
  "title": "Manutenção Programada",
  "message": "O sistema entrará em manutenção às 23h",
  "type": "warning"
}
```

### `GET /api/notifications`
Listar notificações

**Query Parameters:**
- `room` - Filtrar por sala (default: global)
- `limit` - Número máximo de resultados (default: 50)
- `type` - Filtrar por tipo

**Exemplo:**
```
GET /api/notifications?room=global&limit=20&type=error
```

### `GET /api/stats`
Obter estatísticas do sistema

**Resposta:**
```json
{
  "total_notifications": 150,
  "active_connections": 12,
  "registered_users": 8,
  "active_rooms": 3,
  "notifications_by_type": {
    "info": 80,
    "success": 40,
    "warning": 20,
    "error": 10
  },
  "notifications_by_room": {
    "global": 100,
    "vip": 30,
    "alerts": 20
  }
}
```

### `DELETE /api/notifications/:id`
Deletar uma notificação específica

### `POST /api/cleanup`
Remover notificações antigas

**Body:**
```json
{
  "days": 7
}
```

## 🔌 WebSocket Events

### Client → Server

#### `register`
Registrar usuário no sistema

```javascript
socket.emit('register', {
  userId: 'user123'
});
```

#### `join_room`
Entrar em uma sala

```javascript
socket.emit('join_room', {
  room: 'vip-users'
});
```

#### `leave_room`
Sair de uma sala

```javascript
socket.emit('leave_room', {
  room: 'vip-users'
});
```

#### `mark_read`
Marcar notificação como lida

```javascript
socket.emit('mark_read', {
  id: 'notification-id'
});
```

### Server → Client

#### `registered`
Confirmação de registro

```javascript
socket.on('registered', (data) => {
  console.log('Registrado:', data.userId);
});
```

#### `notification`
Nova notificação recebida

```javascript
socket.on('notification', (notification) => {
  console.log('Nova notificação:', notification);
});
```

#### `room_joined`
Confirmação de entrada na sala

```javascript
socket.on('room_joined', (data) => {
  console.log('Sala:', data.room);
});
```

#### `user_joined`
Outro usuário entrou na sala

```javascript
socket.on('user_joined', (data) => {
  console.log('Novo usuário na sala:', data.socketId);
});
```

## 🎯 Exemplos de Uso

### JavaScript (Client-Side)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>
  <div id="notifications"></div>

  <script>
    const socket = io('http://localhost:3000');

    // Conectar
    socket.on('connect', () => {
      console.log('Conectado!');
      
      // Registrar
      socket.emit('register', {
        userId: 'user123'
      });
    });

    // Receber notificações
    socket.on('notification', (notification) => {
      const div = document.getElementById('notifications');
      div.innerHTML += `
        <div class="notification ${notification.type}">
          <h3>${notification.title}</h3>
          <p>${notification.message}</p>
          <small>${new Date(notification.timestamp).toLocaleString()}</small>
        </div>
      `;
    });

    // Entrar em sala VIP
    socket.emit('join_room', {
      room: 'vip'
    });
  </script>
</body>
</html>
```

### Node.js (Enviar Notificação)

```javascript
const axios = require('axios');

async function sendNotification() {
  const response = await axios.post('http://localhost:3000/api/notify', {
    title: 'Pedido Aprovado',
    message: 'Seu pedido #1234 foi aprovado!',
    type: 'success',
    room: 'user-123',
    sender: 'Sistema de Pedidos'
  });
  
  console.log('Notificação enviada:', response.data);
}

sendNotification();
```

### cURL

```bash
# Enviar notificação
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Novo Pedido",
    "message": "Pedido #1234 recebido",
    "type": "info",
    "room": "global"
  }'

# Broadcast
curl -X POST http://localhost:3000/api/notify/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Atualização",
    "message": "Nova versão disponível",
    "type": "success"
  }'

# Listar notificações
curl http://localhost:3000/api/notifications?room=global&limit=10

# Estatísticas
curl http://localhost:3000/api/stats
```

## 🎨 Sistema de Salas

As salas permitem segmentar notificações por grupos:

```javascript
// Notificação para administradores
await axios.post('/api/notify', {
  room: 'admins',
  title: 'Alerta de Segurança',
  message: 'Tentativa de acesso não autorizado'
});

// Notificação para usuário específico
await axios.post('/api/notify', {
  room: 'user-123',
  title: 'Bem-vindo',
  message: 'Sua conta foi criada com sucesso'
});
```

## 📊 Tipos de Notificações

### Info (Azul)
Informações gerais
```json
{
  "type": "info",
  "title": "Atualização Disponível"
}
```

### Success (Verde)
Ações bem-sucedidas
```json
{
  "type": "success",
  "title": "Pedido Concluído"
}
```

### Warning (Amarelo)
Avisos importantes
```json
{
  "type": "warning",
  "title": "Manutenção Programada"
}
```

### Error (Vermelho)
Erros e problemas
```json
{
  "type": "error",
  "title": "Falha no Pagamento"
}
```

## 🔐 Casos de Uso

### 1. Sistema de Chat
```javascript
socket.emit('join_room', { room: 'chat-room-1' });
```

### 2. Notificações de Pedidos
```javascript
POST /api/notify
{
  "room": "user-123",
  "title": "Pedido Enviado",
  "type": "success"
}
```

### 3. Alertas do Sistema
```javascript
POST /api/notify/broadcast
{
  "title": "Servidor em Manutenção",
  "type": "warning",
  "priority": "urgent"
}
```

### 4. Dashboard em Tempo Real
```javascript
socket.on('notification', (notif) => {
  updateDashboard(notif);
});
```

## 🎨 Interface Web

O sistema inclui uma interface web completa em `/public/index.html` com:

- 📊 Dashboard de estatísticas
- ✉️ Formulário de envio de notificações
- 📋 Lista de notificações em tempo real
- 🎨 Design responsivo e moderno
- 🔔 Animações suaves

## 🚀 Deploy

### Heroku
```bash
heroku create
git push heroku main
```

### Vercel/Railway
Suporte nativo para WebSocket

### PM2
```bash
pm2 start server.js --name notification-system
```

## 📄 Licença

MIT

## 👨‍💻 Autor

Desenvolvido por SantanaDev

---

⭐ Se este projeto foi útil, considere dar uma estrela!
