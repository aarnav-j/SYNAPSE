const express = require('express');
const router = express.Router();
const noteModel = require('../models/noteModel');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const notes = await noteModel.find().exec();
        if (notes.length > 0) {
            res.json(notes);
        } else {
            res.json([]);
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notes' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const note = new noteModel(req.body);
        await note.save();
        res.json(note);
    } catch (err) {
        res.status(500).json({ message: 'Error creating note' });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const note = await noteModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(note);
    } catch (err) {
        res.status(404).json({ message: 'Note not found' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        await noteModel.findByIdAndRemove(req.params.id);
        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(404).json({ message: 'Note not found' });
    }
});

module.exports = router;