const noteForm = document.getElementById('note-form');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const saveNoteButton = document.getElementById('save-note');
const notesContainer = document.getElementById('notes-container');

noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const noteTitle = noteTitleInput.value.trim(); // Trim whitespace
    const noteContent = noteContentInput.value.trim(); // Trim whitespace

    if (!noteTitle || !noteContent) {
        alert('Please enter both title and content for the note.');
        return;
    }

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: noteTitle, content: noteContent })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const note = await response.json();
        renderNote(note); // This will now correctly add a new note
        noteTitleInput.value = '';
        noteContentInput.value = '';
    } catch (err) {
        console.error('Error creating note:', err);
        alert('Failed to create note. Please try again.');
    }
});

async function getNotes() {
    try {
        const response = await fetch('/api/notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            notesContainer.innerHTML = ''; // Clear existing notes before rendering
            data.forEach((note) => {
                renderNote(note);
            });
        } else {
            console.error('Error fetching notes: Expected an array, but got:', data);
        }
    } catch (err) {
        console.error('Error fetching notes:', err);
        alert('Failed to load notes. Please check server connection.');
    }
}

async function updateNote(id, title, content) {
    try {
        const response = await fetch(`/api/notes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const note = await response.json();
        renderNote(note); // This will now correctly update the existing note
    } catch (err) {
        console.error('Error updating note:', err);
        alert('Failed to update note. Please try again.');
    }
}

async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return; // User cancelled deletion
    }
    try {
        const response = await fetch(`/api/notes/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const message = await response.json();
        console.log(message);
        const noteElement = document.querySelector(`.note[data-id="${id}"]`);
        if (noteElement) {
            noteElement.remove();
        }
    } catch (err) {
        console.error('Error deleting note:', err);
        alert('Failed to delete note. Please try again.');
    }
}

function renderNote(note) {
    let noteElement = document.querySelector(`.note[data-id="${note._id}"]`);
    let noteTitleElement;
    let noteContentElement;

    if (!noteElement) {
        // Create new note element if it doesn't exist
        noteElement = document.createElement('div');
        noteElement.classList.add('note');
        noteElement.setAttribute('data-id', note._id);

        noteTitleElement = document.createElement('div');
        noteTitleElement.classList.add('note-title');
        noteElement.appendChild(noteTitleElement);

        noteContentElement = document.createElement('div');
        noteContentElement.classList.add('note-content');
        noteElement.appendChild(noteContentElement);

        const noteActions = document.createElement('div');
        noteActions.classList.add('note-actions');

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-button');
        editButton.addEventListener('click', () => {
            const newTitle = prompt('Enter new title:', note.title);
            const newContent = prompt('Enter new content:', note.content);
            // Only update if user didn't cancel prompts and values are not empty
            if (newTitle !== null && newContent !== null && newTitle.trim() !== '' && newContent.trim() !== '') {
                updateNote(note._id, newTitle.trim(), newContent.trim());
            } else if (newTitle !== null || newContent !== null) { // If one was filled and not cancelled
                alert('Title and content cannot be empty.');
            }
        });
        noteActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            deleteNote(note._id);
        });
        noteActions.appendChild(deleteButton);

        noteElement.appendChild(noteActions); // Append the actions container
        notesContainer.appendChild(noteElement); // Append the new note to the container
    } else {
        // If note element already exists, get its title and content elements
        noteTitleElement = noteElement.querySelector('.note-title');
        noteContentElement = noteElement.querySelector('.note-content');
    }

    // Update content regardless if it's new or existing
    if (noteTitleElement) {
        noteTitleElement.textContent = note.title;
    }
    if (noteContentElement) {
        noteContentElement.textContent = note.content;
    }
}

// Initial load of notes
getNotes();