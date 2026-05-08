const express = require('express');
const router = express.Router();
const apiKeyMiddleware = require('../middleware/apiKey');
const weatherService = require('../services/weatherService');

router.get('/:city', apiKeyMiddleware, async (req, res) => {
  try {
    const city = req.params.city;
    const weatherData = await weatherService.getWeatherData(city, req.apiKey);
    res.json(weatherData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to retrieve weather data');
  }
});

module.exports = router;