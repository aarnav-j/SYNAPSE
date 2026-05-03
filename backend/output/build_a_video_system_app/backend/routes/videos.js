const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const videoModel = require('../models/videoModel');

// GET all videos
router.get('/', (req, res) => {
  try {
    const videos = videoModel.getAllVideos();
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Failed to retrieve videos' });
  }
});

// POST a new video
// 'video' is the field name expected in the form data for the file upload
router.post('/', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }
    if (!req.body.title || req.body.title.trim() === '') {
      return res.status(400).json({ message: 'Video title is required.' });
    }

    const { title } = req.body;
    const filename = req.file.filename;

    const newVideo = videoModel.addVideo(title, filename);
    res.status(201).json(newVideo); // Respond with the newly created video object
  } catch (error) {
    console.error('Error uploading video:', error);
    // Provide a more specific error message if available
    res.status(500).json({ message: 'Failed to upload video', error: error.message });
  }
});

module.exports = router;