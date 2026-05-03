const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // Handle incoming chat messages
  socket.on('message', (data) => {
    // Broadcast message to all connected clients
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    // Connection closed
  });
});

server.listen(5000, () => {
  console.log('Server listening on port 5000');
});