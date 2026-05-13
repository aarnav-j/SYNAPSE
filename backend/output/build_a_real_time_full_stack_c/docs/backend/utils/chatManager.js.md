# backend/utils/chatManager.js

The `chatManager.js` was storing user `id` and `username`. To correctly associate Socket.IO connections with these users, we need to store the `socket.id` as well.

This update modifies the `addUser` function to accept and store the `socketId`. This allows the `socketHandler` to easily retrieve user information based on the active socket connection, which is crucial for handling messages and disconnections correctly.
