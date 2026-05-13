const express = require('express');
const path = require('path');
const cors = require('cors');
const chatManager = require('./utils/chatManager'); // Import chatManager

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// New endpoint to get initial messages
app.get('/messages', (req, res) => {
  try {
    const messages = chatManager.getMessages();
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve messages' });
  }
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'style.css'));
});

app.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'app.js'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ success: false, error: 'Internal Server Error' });
});

module.exports = app;