const express = require('express');
const router = express.Router();
const notesData = require('./notesData');

router.get('/', (req, res) => {
  const notes = notesData.getAllNotes();
  res.json(notes);
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const note = notesData.getNoteById(id);
  if (note) {
    res.json(note);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

router.post('/', (req, res) => {
  const { title, content } = req.body;
  const newNote = notesData.createNote(title, content);
  res.json(newNote);
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const updatedNote = notesData.updateNote(id, title, content);
  if (updatedNote) {
    res.json(updatedNote);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = notesData.deleteNote(id);
  if (deleted) {
    res.json({ message: 'Note deleted successfully' });
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

module.exports = router;