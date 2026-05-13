const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
const showAllBtn = document.getElementById('show-all-btn');
const showCompletedBtn = document.getElementById('show-completed-btn');
const showIncompleteBtn = document.getElementById('show-incomplete-btn');

let todos = [];
let filter = 'all';

fetch('/api/todos')
  .then((response) => response.json())
  .then((data) => {
    todos = data;
    renderTodos();
  })
  .catch((error) => console.error('Error fetching todos:', error));

addTodoBtn.addEventListener('click', () => {
  const text = todoInput.value.trim();
  if (text) {
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((response) => response.json())
      .then((newTodo) => {
        todos.push(newTodo);
        renderTodos();
        todoInput.value = '';
      })
      .catch((error) => console.error('Error adding todo:', error));
  }
});

showAllBtn.addEventListener('click', () => {
  filter = 'all';
  renderTodos();
});

showCompletedBtn.addEventListener('click', () => {
  filter = 'completed';
  renderTodos();
});

showIncompleteBtn.addEventListener('click', () => {
  filter = 'incomplete';
  renderTodos();
});

todoList.addEventListener('click', (event) => {
  if (event.target.tagName === 'INPUT') {
    const id = parseInt(event.target.dataset.id);
    const todo = todos.find((t) => t.id === id);
    todo.completed = !todo.completed;
    fetch(`/api/todos/${id}/complete`, { method: 'PUT' })
      .then((response) => response.json())
      .then((updatedTodo) => {
        const index = todos.findIndex((todo) => todo.id === id);
        todos[index] = updatedTodo;
        renderTodos();
      })
      .catch((error) => console.error('Error completing todo:', error));
  } else if (event.target.classList.contains('edit-btn')) {
    const id = parseInt(event.target.dataset.id);
    const todo = todos.find((t) => t.id === id);
    const newText = prompt('Enter new text:', todo.text);
    if (newText) {
      fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
      })
        .then((response) => response.json())
        .then((updatedTodo) => {
          const index = todos.findIndex((todo) => todo.id === id);
          todos[index] = updatedTodo;
          renderTodos();
        })
        .catch((error) => console.error('Error updating todo:', error));
    }
  } else if (event.target.classList.contains('delete-btn')) {
    const id = parseInt(event.target.dataset.id);
    fetch(`/api/todos/${id}`, { method: 'DELETE' })
      .then((response) => {
        const index = todos.findIndex((todo) => todo.id === id);
        todos.splice(index, 1);
        renderTodos();
      })
      .catch((error) => console.error('Error deleting todo:', error));
  }
});

function renderTodos() {
  todoList.innerHTML = '';
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return todo.completed;
    if (filter === 'incomplete') return !todo.completed;
  });
  filteredTodos.forEach((todo) => {
    const card = document.createElement('div');
    card.classList.add('card');
    const text = document.createElement('span');
    text.classList.add('text');
    text.textContent = todo.text;
    card.appendChild(text);
    const actions = document.createElement('div');
    actions.classList.add('actions');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.id = todo.id;
    checkbox.checked = todo.completed;
    actions.appendChild(checkbox);
    const editBtn = document.createElement('button');
    editBtn.classList.add('edit-btn');
    editBtn.dataset.id = todo.id;
    editBtn.textContent = 'Edit';
    actions.appendChild(editBtn);
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.dataset.id = todo.id;
    deleteBtn.textContent = 'Delete';
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    todoList.appendChild(card);
  });
}