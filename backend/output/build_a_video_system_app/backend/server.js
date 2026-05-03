const express = require('express');
const cors = require('cors');
const path = require('path');
const videosRouter = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files from the 'public/videos' directory (for uploaded videos)
// The URL path '/videos' will map to the 'public/videos' directory
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// Serve the React build files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// API routes
app.use('/api/videos', videosRouter);

// Catch-all to serve React's index.html for any client-side routes
// This ensures that refreshing a client-side route (e.g., /some-react-route)
// will still serve the React application.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});