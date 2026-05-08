const express = require('express');
const router = express.Router();
const todoModel = require('./models/todoModel');

router.get('/', (req, res) => {
  res.json(todoModel.getTodos());
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const todo = todoModel.getTodoById(id);
  if (todo) {
    res.json(todo);
  } else {
    res.status(404).json({ message: 'Todo not found' });
  }
});

router.post('/', (req, res) => {
  const { title, description } = req.body;
  const newTodo = todoModel.createTodo(title, description);
  res.json(newTodo);
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { title, description } = req.body;
  const updatedTodo = todoModel.updateTodo(id, title, description);
  if (updatedTodo) {
    res.json(updatedTodo);
  } else {
    res.status(404).json({ message: 'Todo not found' });
  }
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const deleted = todoModel.deleteTodo(id);
  if (deleted) {
    res.json({ message: 'Todo deleted successfully' });
  } else {
    res.status(404).json({ message: 'Todo not found' });
  }
});

module.exports = router;