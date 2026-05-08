import React from 'react';

const TodoList = ({ todos, onUpdateTodo, onDeleteTodo }) => {
  const handleUpdate = (id, updatedTodo) => {
    onUpdateTodo(updatedTodo);
  };

  const handleDelete = (id) => {
    onDeleteTodo(id);
  };

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleUpdate(todo.id, { ...todo, completed: !todo.completed })}
          />
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
          <button onClick={() => handleDelete(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

export default TodoList;