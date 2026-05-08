const fs = require('fs');
let notes = [
  { id: 1, title: 'Note 1', content: 'This is note 1' },
  { id: 2, title: 'Note 2', content: 'This is note 2' },
];

function getAllNotes() {
  return notes;
}

function getNoteById(id) {
  return notes.find((note) => note.id === id);
}

function createNote(title, content) {
  const newNote = { id: notes.length + 1, title, content };
  notes.push(newNote);
  return newNote;
}

function updateNote(id, title, content) {
  const noteIndex = notes.findIndex((note) => note.id === id);
  if (noteIndex !== -1) {
    notes[noteIndex].title = title;
    notes[noteIndex].content = content;
    return notes[noteIndex];
  }
  return null;
}

function deleteNote(id) {
  const noteIndex = notes.findIndex((note) => note.id === id);
  if (noteIndex !== -1) {
    notes.splice(noteIndex, 1);
    return true;
  }
  return false;
}

module.exports = { getAllNotes, getNoteById, createNote, updateNote, deleteNote };