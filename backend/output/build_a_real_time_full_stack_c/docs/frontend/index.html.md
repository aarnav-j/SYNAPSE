# frontend/index.html

The frontend needs the Socket.IO client library to establish a WebSocket connection with the server.

This update adds the `<script src="/socket.io/socket.io.js"></script>` tag before `app.js`. This script is automatically served by the Socket.IO server and provides the `io()` function needed by `frontend/app.js` to connect.
