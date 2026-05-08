const express = require('express');
const router = express.Router();
const videoModel = require('../models/videoModel');
const helper = require('../utils/helper');

router.get('/', (req, res) => {
  const videos = videoModel.getVideos();
  res.json(videos);
});

router.post('/', (req, res) => {
  const video = req.body;
  videoModel.addVideo(video);
  res.json(video);
});

module.exports = router;