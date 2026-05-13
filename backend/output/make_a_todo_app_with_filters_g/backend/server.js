const express = require('express');
const path = require('path');
const cors = require('cors');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api', routes);
app.use(express.static(path.join(__dirname, '../frontend')));

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});