const appState = {
    todos: []
};

const apiHelper = {
    get: async (url) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    },
    post: async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    },
    put: async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    },
    delete: async (url) => {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error(error);
        }
    }
};

const UI = {
    showToast: (message) => {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '50%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        toast.style.background = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '1rem';
        toast.style.borderRadius = '0.5rem';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 2000);
    },
    showLoading: (element) => {
        const loading = document.createElement('div');
        loading.textContent = 'Loading...';
        loading.style.position = 'absolute';
        loading.style.top = '50%';
        loading.style.left = '50%';
        loading.style.transform = 'translate(-50%, -50%)';
        loading.style.background = '#333';
        loading.style.color = '#fff';
        loading.style.padding = '1rem';
        loading.style.borderRadius = '0.5rem';
        element.appendChild(loading);
        return loading;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const todoList = document.getElementById('todo-list');
    const createTodoForm = document.getElementById('create-todo-form');
    const todoInput = document.getElementById('todo-input');

    const todos = await apiHelper.get('/api/todos');
    appState.todos = todos;
    renderTodoList();

    createTodoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const loading = UI.showLoading(createTodoForm);
        const todoText = todoInput.value.trim();
        if (todoText) {
            try {
                const newTodo = await apiHelper.post('/api/todos', { text: todoText });
                appState.todos.push(newTodo);
                renderTodoList();
                todoInput.value = '';
                UI.showToast('Todo created successfully!');
            } catch (error) {
                UI.showToast('Error creating todo!');
            } finally {
                loading.remove();
            }
        } else {
            UI.showToast('Please enter a todo item!');
        }
    });

    todoList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-todo')) {
            const todoId = event.target.dataset.id;
            try {
                await apiHelper.delete(`/api/todos/${todoId}`);
                appState.todos = appState.todos.filter((todo) => todo.id !== parseInt(todoId));
                renderTodoList();
                UI.showToast('Todo deleted successfully!');
            } catch (error) {
                UI.showToast('Error deleting todo!');
            }
        } else if (event.target.classList.contains('update-todo')) {
            const todoId = event.target.dataset.id;
            const todoText = event.target.dataset.text;
            const updateTodoForm = document.createElement('form');
            updateTodoForm.innerHTML = `
                <input type="text" value="${todoText}" />
                <button>Update</button>
            `;
            todoList.replaceChild(updateTodoForm, event.target.parentNode);
            updateTodoForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const loading = UI.showLoading(updateTodoForm);
                const updatedTodoText = updateTodoForm.querySelector('input').value.trim();
                try {
                    const updatedTodo = await apiHelper.put(`/api/todos/${todoId}`, { text: updatedTodoText });
                    appState.todos = appState.todos.map((todo) => todo.id === parseInt(todoId) ? updatedTodo : todo);
                    renderTodoList();
                    UI.showToast('Todo updated successfully!');
                } catch (error) {
                    UI.showToast('Error updating todo!');
                } finally {
                    loading.remove();
                }
            });
        }
    });

    function renderTodoList() {
        todoList.innerHTML = '';
        appState.todos.forEach((todo) => {
            const todoItem = document.createElement('li');
            todoItem.innerHTML = `
                <span>${todo.text}</span>
                <button class="delete-todo" data-id="${todo.id}">Delete</button>
                <button class="update-todo" data-id="${todo.id}" data-text="${todo.text}">Update</button>
            `;
            todoList.appendChild(todoItem);
        });
    }
});