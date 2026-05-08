const authMiddleware = (req, res, next) => {
  // Basic authentication logic
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token === 'secret-token') {
      next();
    } else {
      res.status(401).send('Invalid token');
    }
  } else {
    res.status(401).send('No token provided');
  }
};

module.exports = authMiddleware;