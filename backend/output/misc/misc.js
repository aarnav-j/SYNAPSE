import React, { useState } from 'react';

const MessageInput = ({ socket }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      socket.emit('message', {
        text: message,
        id: `${socket.id}${Math.random()}`,
        socketID: socket.id,
        timestamp: new Date().toISOString()
      });
      setMessage('');
    }
  };

  return (
    <div className="message-input-wrapper">
      <form className="form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Write message..."
          className="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="sendBtn">
          SEND
        </button>
      </form>
    </div>
  );
};

export default MessageInput;