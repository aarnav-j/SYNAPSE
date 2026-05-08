import React, { useState, useEffect } from 'react';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/todos')
      .then((response) => response.json())
      .then((data) => setTodos(data))
      .catch((error) => console.error(error));
  }, []);

  const handleAddTodo = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodo }),
      });
      const data = await response.json();
      setTodos(data);
      setNewTodo('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Todo List</h2>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>{todo.text}</li>
        ))}
      </ul>
      <form onSubmit={handleAddTodo}>
        <input type="text" value={newTodo} onChange={(event) => setNewTodo(event.target.value)} />
        <button type="submit">Add Todo</button>
      </form>
    </div>
  );
};

export default TodoList;