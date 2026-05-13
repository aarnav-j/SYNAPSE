# backend/socketHandler.js

The previous `socketHandler.js` attempted to retrieve the user ID from `socket.handshake.query.id`, which is incorrect for a client connecting with `io()` without query parameters. This made it impossible to identify the sender of a message or the user disconnecting.

This updated `socketHandler.js` now correctly manages user state:
1.  **`join` event**: When a user joins, a unique `id` is generated, and `chatManager.addUser` is called with this `id`, the `username`, and the `socket.id`. The generated `id` is then stored on `socket.data.customUserId` for easy retrieval in subsequent events. A system message is broadcast to announce the new user.
2.  **`message` event**: It now retrieves the `customUserId` directly from `socket.data`. It then fetches the user's details from `chatManager` and broadcasts the message to all connected clients.
3.  **`disconnect` event**: It retrieves the `customUserId` from `socket.data` to correctly identify and remove the disconnected user from `chatManager`, and broadcasts a system message about the user leaving.
This ensures that user identity is consistently maintained throughout the Socket.IO session.
