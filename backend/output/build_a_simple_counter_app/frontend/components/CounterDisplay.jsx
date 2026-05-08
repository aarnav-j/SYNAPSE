import React from 'react';

/**
 * Functional component to display the current counter value.
 * @param {object} props - The component props.
 * @param {number} props.count - The current count to display.
 */
function CounterDisplay({ count }) {
  return (
    <div style={{ fontSize: '3em', margin: '20px 0' }}>
      Current Count: {count}
    </div>
  );
}

export default CounterDisplay;