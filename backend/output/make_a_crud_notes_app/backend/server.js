const express = require('express');
const path = require('path');
const cors = require('cors');
const notesRouter = require('./routes/notes');
require('./utils/db'); // Ensure database connection is established

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/notes', notesRouter);

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});