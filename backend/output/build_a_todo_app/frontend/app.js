This is the JavaScript file for the frontend application. It will handle the logic for the todo list.
</EXPLANATION>

const todoList = document.getElementById('todo-list');
const addTodoForm = document.getElementById('add-todo-form');
const newTodoInput = document.getElementById('new-todo');

let todos = [];

const fetchTodos = async () => {
    try {
        const response = await fetch('http://localhost:3001/todos');
        const data = await response.json();
        todos = data;
        renderTodos();
    } catch (error) {
        console.error(error);
    }
};

const renderTodos = () => {
    const todoHtml = todos.map((todo) => {
        return `
            <li>
                <input type="checkbox" ${todo.completed ? 'checked' : ''} />
                <span>${todo.text}</span>
                <button onclick="deleteTodo(${todo.id})">Delete</button>
            </li>
        `;
    }).join('');
    todoList.innerHTML = todoHtml;
};

const addTodo = async (newTodo) => {
    try {
        const response = await fetch('http://localhost:3001/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTodo),
        });
        const todo = await response.json();
        todos.push(todo);
        renderTodos();
    } catch (error) {
        console.error(error);
    }
};

const deleteTodo = async (id) => {
    try {
        await fetch(`http://localhost:3001/todos/${id}`, {
            method: 'DELETE',
        });
        todos = todos.filter((todo) => todo.id !== id);
        renderTodos();
    } catch (error) {
        console.error(error);
    }
};

addTodoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newTodo = { text: newTodoInput.value, completed: false };
    addTodo(newTodo);
    newTodoInput.value = '';
});

fetchTodos();