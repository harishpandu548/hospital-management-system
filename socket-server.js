const { Server } = require('socket.io');
const http = require('http');

// Use a separate port for the WebSocket server
const PORT = 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket Server Running\n');
});

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for local dev
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // Join a room specifically for a doctor's dashboard notifications
  socket.on('join-doctor', (doctorId) => {
    socket.join(`doctor_${doctorId}`);
  });

  // When a patient requests an instant consultation
  socket.on('request-consultation', (data) => {
    io.to(`doctor_${data.doctorId}`).emit('incoming-consultation', data.consultation);
  });

  // Global Dashboard Events
  socket.on('join-receptionist', () => socket.join('receptionists'));
  socket.on('join-admin', () => socket.join('admins'));
  
  socket.on('appointment-update', () => {
    io.to('receptionists').emit('appointment-update');
    io.to('admins').emit('appointment-update');
    // Also let patients know their queue might have changed
    socket.broadcast.emit('appointment-update');
  });

  socket.on('ai-booking-success', (data) => {
    io.to('admins').emit('ai-booking-alert', data);
    io.to('receptionists').emit('ai-booking-alert', data);
  });

  socket.on('doctor-status-changed', (data) => {
    // broadcast to all patients/admins that a doctor is online/offline
    socket.broadcast.emit('doctor-status-changed', data);
  });

  socket.on('audit-log', (data) => {
    io.to('admins').emit('audit-log', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('payment-updated', (data) => {
    io.to('receptionists').emit('payment-updated', data);
    io.to('admins').emit('payment-updated', data);
  });

  console.log(`User connected: ${socket.id}`);

  // --- WebRTC Signaling & Chat ---
  // When a user joins a consultation room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
    // Notify others in the room
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // Relay WebRTC signals (offer, answer, ice-candidate)
  socket.on('signal', (data) => {
    // data should contain { roomId, type, payload, senderRole }
    // Broadcast the signal to everyone else in the room
    socket.to(data.roomId).emit('signal', data);
  });

  // Relay chat messages instantly
  socket.on('chat-message', (data) => {
    // data should contain { roomId, message }
    socket.to(data.roomId).emit('chat-message', data.message);
  });

  // Relay typing indicators
  socket.on('typing', (data) => {
    // data should contain { roomId, role }
    socket.to(data.roomId).emit('typing', data);
  });

  // --- Global Notifications ---
  // When a user logs in, they join a room based on their user ID
  socket.on('join-notifications', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${socket.id} listening for notifications: user_${userId}`);
  });

  // For broadcasting a new notification to a specific user
  socket.on('send-notification', (data) => {
    // data should contain { userId, notification }
    socket.to(`user_${data.userId}`).emit('new-notification', data.notification);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Socket.io Server is running on port ${PORT}`);
});
