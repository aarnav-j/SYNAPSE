const http = require('http');
const apiKey = 'YOUR_API_KEY_HERE';

module.exports = (req, res, next) => {
  const providedApiKey = req.header('x-api-key');
  if (providedApiKey === apiKey) {
    req.apiKey = providedApiKey;
    next();
  } else {
    res.status(401).send('Invalid API key');
  }
};