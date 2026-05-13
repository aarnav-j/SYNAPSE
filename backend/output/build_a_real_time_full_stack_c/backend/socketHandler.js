const chatManager = require('./utils/chatManager');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', (username) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      chatManager.addUser(id, username, socket.id); // Store socket.id in chatManager
      socket.emit('joined', id); // Emit custom ID back to the client
      socket.data.customUserId = id; // Store custom ID on the socket for easy retrieval

      // Notify all users that a new user has joined
      io.emit('message', { id: 'system', username: 'System', text: `${username} has joined the chat.`, timestamp: new Date().toISOString() });
    });

    socket.on('message', (text) => {
      const customUserId = socket.data.customUserId; // Retrieve custom user ID from socket data

      if (!customUserId) {
          console.error(`Message received from unknown user (socket ID: ${socket.id}). User not joined.`);
          return;
      }

      const user = chatManager.getUsers()[customUserId];
      if (!user) {
          console.error(`User with custom ID ${customUserId} not found in chatManager.`);
          return;
      }

      const username = user.username;
      const timestamp = new Date().toISOString();
      chatManager.addMessage(customUserId, username, text, timestamp);
      io.emit('message', { id: customUserId, username, text, timestamp });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      const customUserId = socket.data.customUserId; // Retrieve custom ID from socket data

      if (customUserId) {
          const disconnectedUser = chatManager.getUsers()[customUserId];
          if (disconnectedUser) {
              chatManager.removeUser(customUserId);
              io.emit('message', { id: 'system', username: 'System', text: `${disconnectedUser.username} has left the chat.`, timestamp: new Date().toISOString() });
          } else {
              console.log(`Disconnected user with custom ID ${customUserId} not found in chatManager.`);
          }
      } else {
          console.log(`Disconnected socket ${socket.id} had no customUserId.`);
      }
    });
  });
};