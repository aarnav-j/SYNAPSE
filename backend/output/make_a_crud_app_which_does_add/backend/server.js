const express = require('express');
const path = require('path');
const notesRouter = require('./routes/notes');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/notes', notesRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});