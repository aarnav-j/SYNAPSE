const noteForm = document.getElementById('note-form');
const notesList = document.getElementById('notes-list');

noteForm.addEventListener('submit', createNote);

function createNote(event) {
  event.preventDefault();
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;

  if (!title.trim() && !content.trim()) {
    alert('Please enter a title or content for the note.');
    return;
  }

  fetch('/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, content })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to create note');
    }
    return response.json();
  })
  .then(note => {
    renderNote(note);
    noteForm.reset();
  })
  .catch(error => console.error('Error creating note:', error));
}

function renderNote(note) {
  const noteElement = document.createElement('li');
  noteElement.classList.add('note');
  // Add data-id to the li element for easier targeting
  noteElement.dataset.id = note.id; 
  noteElement.innerHTML = `
    <h2 class="note-title">${note.title}</h2>
    <p class="note-content">${note.content}</p>
    <button class="edit-note" data-id="${note.id}">Edit</button>
    <button class="delete-note" data-id="${note.id}">Delete</button>
  `;
  notesList.appendChild(noteElement);

  // Re-attach event listeners to the new buttons
  const editButton = noteElement.querySelector('.edit-note');
  const deleteButton = noteElement.querySelector('.delete-note');
  editButton.addEventListener('click', editNote);
  deleteButton.addEventListener('click', deleteNote);
}

function editNote(event) {
  const id = event.target.dataset.id;
  // Find the specific note element using its data-id attribute
  const currentNoteElement = notesList.querySelector(`li[data-id="${id}"]`);

  if (!currentNoteElement) {
    console.error(`Error: Note element with data-id="${id}" not found for editing.`);
    return;
  }
  
  // Get current title and content to pre-fill the prompts
  const currentTitle = currentNoteElement.querySelector('.note-title').textContent;
  const currentContent = currentNoteElement.querySelector('.note-content').textContent;

  const title = prompt('Enter new title:', currentTitle);
  const content = prompt('Enter new content:', currentContent);

  // If user cancels either prompt, title or content will be null
  if (title === null || content === null) {
    console.log('Edit cancelled by user.');
    return; // Stop the function if cancelled
  }

  // If both are empty strings after trimming, consider it a cancellation or invalid input
  if (!title.trim() && !content.trim()) {
    alert('Title and content cannot be empty. Edit cancelled.');
    return;
  }

  fetch(`/api/notes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, content })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to update note');
    }
    return response.json();
  })
  .then(note => {
    // Update the specific note element's content directly
    currentNoteElement.querySelector('.note-title').textContent = note.title;
    currentNoteElement.querySelector('.note-content').textContent = note.content;
    // No need to re-attach listeners as buttons were not replaced
  })
  .catch(error => console.error('Error updating note:', error));
}

function deleteNote(event) {
  const id = event.target.dataset.id;
  // Find the specific note element to remove using its data-id attribute
  const noteElementToRemove = notesList.querySelector(`li[data-id="${id}"]`);

  if (!noteElementToRemove) {
    console.error(`Error: Note element with data-id="${id}" not found for deletion.`);
    return;
  }

  fetch(`/api/notes/${id}`, {
    method: 'DELETE'
  })
  .then(response => {
    if (response.ok) {
      noteElementToRemove.remove();
    } else {
      throw new Error('Failed to delete note on server.');
    }
  })
  .catch(error => console.error('Error deleting note:', error)); // Corrected catch block
}

// Initial fetch to load all notes
fetch('/api/notes')
.then(response => {
  if (!response.ok) {
    throw new Error('Failed to fetch notes');
  }
  return response.json();
})
.then(notes => {
  notes.forEach(note => renderNote(note));
})
.catch(error => console.error('Error fetching notes:', error));