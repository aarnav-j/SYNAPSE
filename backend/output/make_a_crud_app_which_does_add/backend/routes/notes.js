const express = require('express');
const router = express.Router();
const notes = require('../data/notesData');

// Get all notes
router.get('/', (req, res) => {
  res.json(notes);
});

// Get note by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const note = notes.find((n) => n.id === id);
  if (!note) {
    res.status(404).json({ message: 'Note not found' });
  } else {
    res.json(note);
  }
});

// Create new note
router.post('/', (req, res) => {
  const { title, content } = req.body;
  const newNote = {
    id: notes.length + 1,
    title,
    content
  };
  notes.push(newNote);
  res.json(newNote);
});

// Update existing note
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const note = notes.find((n) => n.id === id);
  if (!note) {
    res.status(404).json({ message: 'Note not found' });
  } else {
    const { title, content } = req.body;
    note.title = title;
    note.content = content;
    res.json(note);
  }
});

// Delete note by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ message: 'Note not found' });
  } else {
    notes.splice(index, 1);
    res.json({ message: 'Note deleted successfully' });
  }
});

module.exports = router;