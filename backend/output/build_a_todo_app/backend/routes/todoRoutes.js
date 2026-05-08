const express = require('express');
const todoModel = require('../models/todoModel');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const todos = todoModel.getTodos();
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching todos' });
  }
});

router.post('/', (req, res) => {
  try {
    const newTodo = todoModel.addTodo(req.body);
    res.json(newTodo);
  } catch (error) {
    res.status(500).json({ message: 'Error adding todo' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const updatedTodo = todoModel.updateTodo(req.params.id, req.body);
    res.json(updatedTodo);
  } catch (error) {
    res.status(404).json({ message: 'Todo not found' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    todoModel.deleteTodo(req.params.id);
    res.json({ message: 'Todo deleted' });
  } catch (error) {
    res.status(404).json({ message: 'Todo not found' });
  }
});

module.exports = router;