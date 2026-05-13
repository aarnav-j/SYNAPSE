const express = require('express');
const router = express.Router();
const todos = require('./todos');

router.post('/todos', todos.addTodo);
router.get('/todos', todos.getTodos);
router.put('/todos/:id', todos.editTodo);
router.put('/todos/:id/complete', todos.completeTodo);
router.delete('/todos/:id', todos.deleteTodo);

module.exports = router;