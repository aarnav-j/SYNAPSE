function errorHandler(err, req, res, next) {
  if (err) {
    res.status(400).json({ success: false, error: err.message });
  } else {
    next();
  }
}

module.exports = errorHandler;