This is the main server file that sets up the Express app and serves static files from the frontend folder.
</EXPLANATION>

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.use(express.static(require('path').join(__dirname, '../frontend')));

const routes = require('./routes');

app.use('/api', routes);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.send({ message: err.message });
});