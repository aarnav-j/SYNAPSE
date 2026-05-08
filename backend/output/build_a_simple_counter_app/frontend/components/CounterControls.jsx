import React from 'react';

/**
 * Functional component for counter control buttons.
 * @param {object} props - The component props.
 * @param {function} props.onIncrement - Callback function for incrementing the counter.
 * @param {function} props.onDecrement - Callback function for decrementing the counter.
 */
function CounterControls({ onIncrement, onDecrement }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
      <button
        onClick={onIncrement}
        style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}
      >
        Increment
      </button>
      <button
        onClick={onDecrement}
        style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}
      >
        Decrement
      </button>
    </div>
  );
}

export default CounterControls;