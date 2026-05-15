const db = require('../utils/db');

function createTodo(data) {
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    db.prepare('INSERT INTO todos (id, title, completed) VALUES (?, ?, ?)').run(id, data.title, data.completed);
    return { success: true, data: { id, ...data } };
  } catch (error) {
    throw error;
  }
}

function getAllTodos() {
  try {
    const todos = db.prepare('SELECT * FROM todos').all();
    return { success: true, data: todos };
  } catch (error) {
    throw error;
  }
}

function getTodoById(id) {
  try {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!todo) {
      throw new Error('Todo not found');
    }
    return { success: true, data: todo };
  } catch (error) {
    throw error;
  }
}

function updateTodo(id, data) {
  try {
    // Ensure the todo exists before attempting to update
    const existingTodo = db.prepare('SELECT id FROM todos WHERE id = ?').get(id);
    if (!existingTodo) {
      throw new Error('Todo not found');
    }
    db.prepare('UPDATE todos SET title = ?, completed = ? WHERE id = ?').run(data.title, data.completed, id);
    return { success: true, data: { id, ...data } };
  } catch (error) {
    throw error;
  }
}

function deleteTodo(id) {
  try {
    const info = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    if (info.changes === 0) {
      throw new Error('Todo not found'); // Throw error if no row was deleted
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
}

module.exports = { createTodo, getAllTodos, getTodoById, updateTodo, deleteTodo };