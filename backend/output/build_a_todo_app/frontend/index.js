This is the index file for the frontend application. It will serve the frontend files.
</EXPLANATION>

const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});