# backend/services/todoService.js

**Problem:** The `deleteTodo` function would return `success: true` even if no todo with the specified `id` was found and deleted, leading to misleading success messages on the frontend.
**Fix:** The `deleteTodo` function now checks the `info.changes` property returned by `db.prepare().run()`. If `changes` is `0`, it means no row was affected, so an `Error('Todo not found')` is thrown. This error will be caught by the `todoRoutes.js` handler, which will then send a `404` status, providing accurate feedback to the client.
**Side Effects Prevented:** This ensures that the backend correctly communicates when a todo item cannot be found for deletion, preventing false positives on the frontend.
