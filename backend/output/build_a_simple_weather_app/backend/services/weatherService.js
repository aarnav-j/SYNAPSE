const axios = require('axios');

const getWeatherData = async (city, apiKey) => {
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
    return response.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = { getWeatherData };