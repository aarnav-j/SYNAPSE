const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./middleware/logger');
const counterRoutes = require('./routes/counterRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Assuming React dev server runs on 5173
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(logger); // Custom logger middleware

// API Routes
app.use('/api', counterRoutes);

// Serve static files from the React app (assuming 'build' directory after npm run build)
// In a real project, you'd build the React app and serve the 'dist' or 'build' folder.
// For development, the React dev server handles this.
// This block is for production deployment or if running frontend from backend.
app.use(express.static(path.join(__dirname, '../frontend/dist'))); // Adjust path as needed

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html')); // Adjust path as needed
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});