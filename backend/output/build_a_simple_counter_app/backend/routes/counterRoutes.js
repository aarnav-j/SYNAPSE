const express = require('express');
const router = express.Router();
const counterModel = require('../models/counterModel');

/**
 * GET /api/counter
 * Retrieves the current counter value.
 */
router.get('/counter', (req, res) => {
  try {
    const currentCount = counterModel.getCounter();
    res.status(200).json({ count: currentCount });
  } catch (error) {
    console.error('Error getting counter:', error);
    res.status(500).json({ message: 'Failed to retrieve counter', error: error.message });
  }
});

/**
 * POST /api/counter
 * Updates the counter value based on the action (increment/decrement).
 * Request body: { "action": "increment" | "decrement" }
 */
router.post('/counter', (req, res) => {
  const { action } = req.body;
  let currentCount = counterModel.getCounter();

  try {
    if (action === 'increment') {
      currentCount++;
    } else if (action === 'decrement') {
      currentCount--;
    } else {
      return res.status(400).json({ message: 'Invalid action specified. Must be "increment" or "decrement".' });
    }

    const updatedCount = counterModel.updateCounter(currentCount);
    res.status(200).json({ count: updatedCount });
  } catch (error) {
    console.error('Error updating counter:', error);
    res.status(500).json({ message: 'Failed to update counter', error: error.message });
  }
});

module.exports = router;