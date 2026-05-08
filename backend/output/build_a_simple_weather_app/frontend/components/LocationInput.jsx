import React, { useState } from 'react';

const LocationInput = ({ onCityChange }) => {
  const [city, setCity] = useState('');

  const handleInputChange = (event) => {
    setCity(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onCityChange(city);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={city} onChange={handleInputChange} placeholder="Enter city" />
      <button type="submit">Get Weather</button>
    </form>
  );
};

export default LocationInput;