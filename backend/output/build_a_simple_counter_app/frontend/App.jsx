import React, { useState, useEffect } from 'react';
import CounterDisplay from './components/CounterDisplay.jsx';
import CounterControls from './components/CounterControls.jsx';

const API_BASE_URL = 'http://localhost:3000/api'; // Backend API URL

function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch the current counter value from the backend
  const fetchCounter = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/counter`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCount(data.count);
    } catch (err) {
      console.error("Failed to fetch counter:", err);
      setError("Failed to load counter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to update the counter value on the backend
  const updateCounter = async (action) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCount(data.count);
    } catch (err) {
      console.error("Failed to update counter:", err);
      setError("Failed to update counter. Please try again.");
    }
  };

  // Fetch counter on component mount
  useEffect(() => {
    fetchCounter();
  }, []);

  const handleIncrement = () => {
    updateCounter('increment');
  };

  const handleDecrement = () => {
    updateCounter('decrement');
  };

  if (loading) {
    return <div>Loading counter...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Simple Counter App</h1>
      <CounterDisplay count={count} />
      <CounterControls
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
      />
    </div>
  );
}

export default App;