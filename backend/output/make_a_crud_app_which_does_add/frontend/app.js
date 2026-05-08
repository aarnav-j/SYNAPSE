const noteList = document.getElementById('note-list');
const noteForm = document.getElementById('note-form');

// Get all notes
fetch('/api/notes')
  .then((res) => res.json())
  .then((notes) => {
    notes.forEach((note) => {
      const noteElement = document.createElement('li');
      noteElement.textContent = `${note.title}: ${note.content}`;
      noteList.appendChild(noteElement);
    });
  })
  .catch((err) => console.error(err));

// Create new note
noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  })
    .then((res) => res.json())
    .then((note) => {
      const noteElement = document.createElement('li');
      noteElement.textContent = `${note.title}: ${note.content}`;
      noteList.appendChild(noteElement);
    })
    .catch((err) => console.error(err));
});

// Update existing note
const updateNote = (id) => {
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  fetch(`/api/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  })
    .then((res) => res.json())
    .then((note) => {
      const noteElement = document.createElement('li');
      noteElement.textContent = `${note.title}: ${note.content}`;
      noteList.appendChild(noteElement);
    })
    .catch((err) => console.error(err));
};

// Delete note by id
const deleteNote = (id) => {
  fetch(`/api/notes/${id}`, {
    method: 'DELETE'
  })
    .then((res) => res.json())
    .then((message) => {
      console.log(message);
    })
    .catch((err) => console.error(err));
};