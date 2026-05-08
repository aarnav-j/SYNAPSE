const express = require('express');
const path = require('path');
const cors = require('cors');
const videoRoutes = require('./routes/videos');
const authMiddleware = require('./middleware/auth');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/videos', videoRoutes);
app.use(authMiddleware);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});