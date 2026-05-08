/**
 * Custom middleware to log incoming requests.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 */
function logger(req, res, next) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next(); // Call next to pass control to the next middleware/route handler
}

module.exports = logger;