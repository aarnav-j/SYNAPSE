const appState = {
    todos: []
};

const UI = {
    showToast: (message, isError = false) => {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px'; // Position at bottom
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = isError ? '#e74c3c' : '#333'; // Red for error, dark for success
        toast.style.color = '#fff';
        toast.style.padding = '1em';
        toast.style.borderRadius = '0.5em';
        toast.style.zIndex = '1001'; // Above loading spinner
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-in-out';
        document.body.appendChild(toast);

        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Fade out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000); // Display for 3 seconds
    },
    showLoading: (loading) => {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) { // Check if element exists
            loadingElement.style.display = loading ? 'block' : 'none';
        }
    }
};

const apiHelper = {
    request: async (url, method, data = null) => {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok || !result.success) {
                // If HTTP status is not 2xx OR backend's success flag is false
                throw new Error(result.error || 'An unknown error occurred');
            }
            return result;
        } catch (error) {
            console.error(`API Error (${method} ${url}):`, error.message);
            UI.showToast(error.message, true); // Show error toast
            throw error; // Re-throw to be caught by specific handlers if needed
        }
    },
    get: async (url) => apiHelper.request(url, 'GET'),
    post: async (url, data) => apiHelper.request(url, 'POST', data),
    put: async (url, data) => apiHelper.request(url, 'PUT', data),
    delete: async (url) => apiHelper.request(url, 'DELETE')
};


document.addEventListener('DOMContentLoaded', async () => {
    UI.showLoading(true);
    try {
        const response = await apiHelper.get('/api/todos');
        if (response && response.success) {
            appState.todos = response.data;
            renderTodos();
        } else {
            UI.showToast(response.error || 'Failed to load todos.', true);
        }
    } catch (error) {
        // Error already shown by apiHelper.request
    } finally {
        UI.showLoading(false);
    }
});

document.getElementById('create-todo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const todoInput = document.getElementById('todo-input');
    const todoTitle = todoInput.value.trim();

    if (todoTitle) {
        UI.showLoading(true);
        try {
            const response = await apiHelper.post('/api/todos', { title: todoTitle, completed: false });
            if (response && response.success) {
                appState.todos.push(response.data);
                renderTodos();
                todoInput.value = '';
                UI.showToast('Todo created successfully!');
            } else {
                UI.showToast(response.error || 'Failed to create todo.', true);
            }
        } catch (error) {
            // Error already shown by apiHelper.request
        } finally {
            UI.showLoading(false);
        }
    } else {
        UI.showToast('Todo title cannot be empty.', true);
    }
});

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const todoId = e.target.dataset.id;
        UI.showLoading(true);
        try {
            const response = await apiHelper.delete(`/api/todos/${todoId}`);
            if (response && response.success) {
                appState.todos = appState.todos.filter((todo) => todo.id !== todoId); // Compare strings directly
                renderTodos();
                UI.showToast('Todo deleted successfully!');
            } else {
                UI.showToast(response.error || 'Failed to delete todo.', true);
            }
        } catch (error) {
            // Error already shown by apiHelper.request
        } finally {
            UI.showLoading(false);
        }
    }
});

document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('todo-checkbox')) {
        const todoId = e.target.dataset.id;
        const completed = e.target.checked;
        await toggleTodoCompleted(todoId, completed);
    }
});

async function toggleTodoCompleted(todoId, completed) {
    UI.showLoading(true);
    try {
        // Find the todo in appState to get its current title
        const todoToUpdate = appState.todos.find(todo => todo.id === todoId);
        if (!todoToUpdate) {
            UI.showToast('Todo not found for update.', true);
            return;
        }

        const response = await apiHelper.put(`/api/todos/${todoId}`, {
            title: todoToUpdate.title, // Keep existing title
            completed: completed
        });

        if (response && response.success) {
            // Update the specific todo in appState
            appState.todos = appState.todos.map(todo =>
                todo.id === todoId ? { ...todo, completed: completed } : todo
            );
            renderTodos();
            UI.showToast(`Todo marked as ${completed ? 'completed' : 'incomplete'}!`);
        } else {
            UI.showToast(response.error || 'Failed to update todo status.', true);
            // Revert checkbox state if update failed
            const checkbox = document.querySelector(`.todo-checkbox[data-id="${todoId}"]`);
            if (checkbox) checkbox.checked = !completed;
        }
    } catch (error) {
        // Error already shown by apiHelper.request
        // Revert checkbox state if update failed
        const checkbox = document.querySelector(`.todo-checkbox[data-id="${todoId}"]`);
        if (checkbox) checkbox.checked = !completed;
    } finally {
        UI.showLoading(false);
    }
}

function renderTodos() {
    const todosElement = document.getElementById('todos');
    todosElement.innerHTML = ''; // Clear existing todos

    if (appState.todos.length === 0) {
        todosElement.innerHTML = '<li style="text-align: center; color: #777;">No todos yet!</li>';
        return;
    }

    appState.todos.forEach((todo) => {
        const todoElement = document.createElement('li');
        todoElement.classList.add('todo-item'); // Add a class for styling if needed

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('todo-checkbox');
        checkbox.checked = todo.completed;
        checkbox.dataset.id = todo.id; // Store todo ID

        const titleSpan = document.createElement('span');
        titleSpan.textContent = todo.title;
        titleSpan.classList.add('todo-title');
        if (todo.completed) {
            titleSpan.classList.add('completed'); // Apply class for styling completed todos
        }

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.dataset.id = todo.id; // Store todo ID

        todoElement.appendChild(checkbox);
        todoElement.appendChild(titleSpan);
        todoElement.appendChild(deleteButton);
        todosElement.appendChild(todoElement);
    });
}