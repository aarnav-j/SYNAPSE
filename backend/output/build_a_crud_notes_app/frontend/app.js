const notesContainer = document.getElementById('notes-container');
const noteForm = document.getElementById('note-form');
const titleInput = document.getElementById('title-input');
const contentInput = document.getElementById('content-input');

function displayNotes() {
    fetch('/api/notes')
        .then((response) => response.json())
        .then((notes) => {
            const notesHtml = notes
                .map((note) => {
                    return `
                        <div>
                            <h2>${note.title}</h2>
                            <p>${note.content}</p>
                            <button onclick="editNote(${note.id})">Edit</button>
                            <button onclick="deleteNote(${note.id})">Delete</button>
                        </div>
                    `;
                })
                .join('');
            notesContainer.innerHTML = notesHtml;
        })
        .catch((error) => console.error(error));
}

function addNote() {
    const title = titleInput.value;
    const content = contentInput.value;
    fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
    })
        .then((response) => response.json())
        .then((note) => {
            displayNotes();
            titleInput.value = '';
            contentInput.value = '';
        })
        .catch((error) => console.error(error));
}

function editNote(id) {
    const title = prompt('Enter new title:');
    const content = prompt('Enter new content:');
    fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
    })
        .then((response) => response.json())
        .then((note) => {
            displayNotes();
        })
        .catch((error) => console.error(error));
}

function deleteNote(id) {
    fetch(`/api/notes/${id}`, {
        method: 'DELETE',
    })
        .then((response) => response.json())
        .then((message) => {
            displayNotes();
        })
        .catch((error) => console.error(error));
}

noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addNote();
});

displayNotes();