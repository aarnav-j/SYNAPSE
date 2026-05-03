import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Basic global styles for the application

// Create a React root for the application, attaching it to the DOM element with id 'root'
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the main App component within React.StrictMode for development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);