const dotenv = require('dotenv');
dotenv.config();

const app = require('./app'); // The Express app from backend/app.js
const http = require('http'); // For creating HTTP server
const socketIo = require('socket.io'); // For Socket.IO
const socketHandler = require('./socketHandler'); // For handling Socket.IO events

const port = process.env.PORT || 3000;

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development, refine in production
    methods: ["GET", "POST"]
  }
});

// Pass the Socket.IO instance to the handler
socketHandler(io);

// Start the HTTP server (which also hosts Socket.IO)
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});