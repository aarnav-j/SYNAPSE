import React, { useState, useEffect } from 'react';
import LocationInput from './components/LocationInput';
import WeatherDisplay from './components/WeatherDisplay';

const App = () => {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  const handleCityChange = (newCity) => {
    setCity(newCity);
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/weather/${city}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve weather data');
      }
      const data = await response.json();
      setWeatherData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setWeatherData(null);
    }
  };

  useEffect(() => {
    if (city) {
      fetchWeatherData();
    }
  }, [city]);

  return (
    <div>
      <LocationInput onCityChange={handleCityChange} />
      {weatherData && <WeatherDisplay weatherData={weatherData} />}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default App;