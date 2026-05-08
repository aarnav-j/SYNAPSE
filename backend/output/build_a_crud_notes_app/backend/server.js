const express = require('express');
const path = require('path');
const cors = require('cors');
const notesRoutes = require('./notesRoutes');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/notes', notesRoutes);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});