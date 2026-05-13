# frontend/app.js

The original `frontend/app.js` was using `fetch` (HTTP POST) for sending messages, which was the direct cause of the "Unexpected token '<'" error. It also lacked proper Socket.IO integration.

This file has been completely refactored to use Socket.IO for real-time chat:
1.  **Removed `apiHelper`**: All chat-related communication now uses Socket.IO.
2.  **`UI.displayMessage`**: A new helper function is added to render messages, including timestamps and basic styling to differentiate own messages. It also handles auto-scrolling.
3.  **Socket.IO Connection**: `const socket = io();` establishes the WebSocket connection.
4.  **User Join Flow**:
    *   Prompts the user for a `username`.
    *   Emits a `join` event to the server with the username.
    *   Listens for the `joined` event from the server to receive the unique `userId` for the session.
5.  **Message Sending**: The `messageForm` submit listener now emits a `message` event via `socket.emit('message', messageText)`.
6.  **Message Receiving**: It listens for `socket.on('message', (msg) => { ... })` and uses `UI.displayMessage` to render incoming messages, including system messages and differentiating own messages based on `userId`.
7.  **Initial Message Load**: After successfully joining (on the `joined` event), it calls `fetchInitialMessages()` which uses a standard `fetch` request to the new `GET /messages` endpoint to load any existing chat history.
8.  **Error Handling**: Includes `try/catch` for `fetch` and `socket.on('connect_error')` for robust error reporting.
This comprehensive update transitions the frontend to a fully functional Socket.IO chat client.
