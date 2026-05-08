# utils/db.js

Removed the deprecated `useNewUrlParser` and `useUnifiedTopology` options from the `mongoose.connect()` call. These options are no longer necessary in modern Mongoose versions and cause a `MongoParseError` if included.
