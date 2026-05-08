let counterValue = 0; // In-memory counter

/**
 * Gets the current value of the counter.
 * @returns {number} The current counter value.
 */
function getCounter() {
  return counterValue;
}

/**
 * Updates the counter value.
 * @param {number} newValue The new value to set the counter to.
 * @returns {number} The updated counter value.
 */
function updateCounter(newValue) {
  if (typeof newValue !== 'number' || isNaN(newValue)) {
    throw new Error('Invalid counter value provided. Must be a number.');
  }
  counterValue = newValue;
  return counterValue;
}

module.exports = {
  getCounter,
  updateCounter
};