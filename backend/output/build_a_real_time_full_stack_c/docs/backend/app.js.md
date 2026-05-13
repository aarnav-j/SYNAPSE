# backend/app.js

The `backend/app.js` file previously only served static files and the `index.html` for the root GET request. The frontend was attempting to fetch initial messages via `GET /`, which was handled by `index.html`.

This update adds a new `GET /messages` endpoint. This endpoint uses `chatManager.getMessages()` to retrieve all stored chat messages and sends them as a JSON response. This provides a proper HTTP API for the frontend to load existing messages when a user joins, separating initial data loading from real-time message exchange via Socket.IO.
