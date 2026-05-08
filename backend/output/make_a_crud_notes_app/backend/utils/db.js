const mongoose = require('mongoose');

// Removed useNewUrlParser and useUnifiedTopology as they are no longer supported
// in recent Mongoose versions and are now the default behavior.
mongoose.connect('mongodb://localhost:27017/notes');

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB connection error:', err); // Added more descriptive error message
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});

module.exports = db;