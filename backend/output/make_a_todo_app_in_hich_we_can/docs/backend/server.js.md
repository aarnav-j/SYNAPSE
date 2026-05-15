# backend/server.js

**Problem:** The `express.static` middleware was not reliably serving `index.html` for the root path (`/`), leading to the "Cannot GET /" error.
**Fix:** An explicit `app.get('/')` route has been added. This route directly sends the `index.html` file when a request to the root path is received, ensuring the frontend loads correctly. This route is placed before the general `express.static` middleware to guarantee precedence for the root HTML file. The `express.static` middleware remains for serving other assets like `app.js` and `style.css`.
**Side Effects Prevented:** This prevents the server from returning a 404 for the root path, allowing the frontend application to load. It does not interfere with API routes or other static asset serving.
