const express = require('express');
const todoRoutes = require('./routes/todoRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/todos', todoRoutes);
app.use(errorHandler);

const port = 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});