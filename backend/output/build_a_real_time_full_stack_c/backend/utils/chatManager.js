const users = {};
const messages = [];

module.exports = {
  addUser: (id, username, socketId) => { // Added socketId parameter
    users[id] = { id, username, socketId }; // Store socketId
  },
  removeUser: (id) => {
    delete users[id];
  },
  addMessage: (id, username, text, timestamp) => {
    messages.push({ id, username, text, timestamp });
  },
  getMessages: () => messages,
  getUsers: () => users
};