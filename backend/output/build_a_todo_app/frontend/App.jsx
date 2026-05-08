This is the React component for the frontend application. It handles the logic for the application and makes API calls to the backend server.
</EXPLANATION>

import React, { useState, useEffect } from 'react';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';

const App = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTodos = async () => {
            setLoading(true);
            try {
                const response = await fetch('http://localhost:3001/todos');
                const data = await response.json();
                setTodos(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTodos();
    }, []);

    const handleAddTodo = (newTodo) => {
        fetch('http://localhost:3001/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTodo),
        })
        .then((response) => response.json())
        .then((data) => {
            setTodos((prevTodos) => [...prevTodos, data]);
        })
        .catch((error) => {
            setError(error.message);
        });
    };

    const handleUpdateTodo = (updatedTodo) => {
        fetch(`http://localhost:3001/todos/${updatedTodo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTodo),
        })
        .then((response) => response.json())
        .then((data) => {
            setTodos((prevTodos) =>
                prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
            );
        })
        .catch((error) => {
            setError(error.message);
        });
    };

    const handleDeleteTodo = (id) => {
        fetch(`http://localhost:3001/todos/${id}`, {
            method: 'DELETE',
        })
        .then(() => {
            setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
        })
        .catch((error) => {
            setError(error.message);
        });
    };

    return (
        <div>
            <h1>Todos</h1>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>Error: {error}</p>
            ) : (
                <TodoList
                    todos={todos}
                    onUpdateTodo={handleUpdateTodo}
                    onDeleteTodo={handleDeleteTodo}
                />
            )}
            <TodoForm onAddTodo={handleAddTodo} />
        </div>
    );
};

export default App;