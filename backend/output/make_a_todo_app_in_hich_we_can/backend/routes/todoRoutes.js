const express = require('express');
const router = express.Router();
const todoService = require('../services/todoService');
const { validateTodo } = require('../utils/validators');

router.post('/api/todos', async (req, res) => {
  try {
    validateTodo(req.body);
    const result = await todoService.createTodo(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/api/todos', async (req, res) => {
  try {
    const result = await todoService.getAllTodos();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/api/todos/:id', async (req, res) => {
  try {
    const result = await todoService.getTodoById(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.put('/api/todos/:id', async (req, res) => {
  try {
    validateTodo(req.body);
    const result = await todoService.updateTodo(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/api/todos/:id', async (req, res) => {
  try {
    const result = await todoService.deleteTodo(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

module.exports = router;