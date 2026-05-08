const express = require('express');
const path = require('path');
const todoRoutes = require('./todoRoutes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/todos', todoRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});