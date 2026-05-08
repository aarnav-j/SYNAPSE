const express = require('express');
const noteModel = require('../models/noteModel');

const router = express.Router();
const notes = new noteModel();

router.get('/', (req, res) => {
  const allNotes = notes.getAllNotes();
  res.json(allNotes);
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const note = notes.getNoteById(id);
  if (note) {
    res.json(note);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

router.post('/', (req, res) => {
  const { title, content } = req.body;
  const newNote = notes.createNote(title, content);
  res.json(newNote);
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const updatedNote = notes.updateNote(id, title, content);
  if (updatedNote) {
    res.json(updatedNote);
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = notes.deleteNote(id);
  if (deleted) {
    res.json({ message: 'Note deleted successfully' });
  } else {
    res.status(404).json({ message: 'Note not found' });
  }
});

module.exports = router;