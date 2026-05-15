const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const todoRoutes = require('./routes/todoRoutes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/todos', todoRoutes);

// Explicitly serve index.html for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Serve other static files (CSS, JS, images) from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Error handling middleware (should be last)
app.use(errorHandler);

const port = process.env.PORT || 52667; // Use environment variable for port
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});