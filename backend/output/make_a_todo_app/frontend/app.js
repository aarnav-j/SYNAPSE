const todoList = document.getElementById('todo-list');
const todoForm = document.getElementById('todo-form');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const submitBtn = document.getElementById('submit-btn');

// Fetch and display 
fetch('/api/todos')
  .then((response) => response.json())
  .then((todos) => {
    todos.forEach((todo) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${todo.title} - ${todo.description}`;
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'edit-btn';
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-btn';
      li.appendChild(textSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);

      // Add event listener to edit button
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const newTitle = prompt('Enter new title:');
        const newDescription = prompt('Enter new description:');
        fetch(`/api/todos/${todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, description: newDescription }),
        })
          .then((response) => response.json())
          .then((updatedTodo) => {
            textSpan.textContent = `${updatedTodo.title} - ${updatedTodo.description}`;
          })
          .catch((error) => console.error(error));
      });

      // Add event listener to delete button
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetch(`/api/todos/${todo.id}`, {
          method: 'DELETE',
        })
          .then((response) => response.json())
          .then((message) => {
            li.remove();
          })
          .catch((error) => console.error(error));
      });
    });
  })
  .catch((error) => console.error(error));

// Add event listener to submit button
submitBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const title = titleInput.value;
  const description = descriptionInput.value;
  fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  })
    .then((response) => response.json())
    .then((newTodo) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${newTodo.title} - ${newTodo.description}`;
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'edit-btn';
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-btn';
      li.appendChild(textSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);

      // Add event listener to edit button
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const newTitle = prompt('Enter new title:');
        const newDescription = prompt('Enter new description:');
        fetch(`/api/todos/${newTodo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, description: newDescription }),
        })
          .then((response) => response.json())
          .then((updatedTodo) => {
            textSpan.textContent = `${updatedTodo.title} - ${updatedTodo.description}`;
          })
          .catch((error) => console.error(error));
      });

      // Add event listener to delete button
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fetch(`/api/todos/${newTodo.id}`, {
          method: 'DELETE',
        })
          .then((response) => response.json())
          .then((message) => {
            li.remove();
          })
          .catch((error) => console.error(error));
      });

      titleInput.value = '';
      descriptionInput.value = '';
    })
    .catch((error) => console.error(error));
});