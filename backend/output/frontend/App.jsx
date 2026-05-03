import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';

const socket = io('http://localhost:5000');

const App = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  const appStyle = {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    height: '80vh'
  };

  return (
    <div style={appStyle}>
      <h2 style={{ textAlign: 'center' }}>Socket.io Chat</h2>
      <ChatWindow messages={messages} />
      <MessageInput socket={socket} />
    </div>
  );
};

export default App;