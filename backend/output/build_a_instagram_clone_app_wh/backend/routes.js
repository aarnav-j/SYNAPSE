
const express = require('express');
const router = express.Router();

const data = require('./data');

router.get('/posts', (req, res) => {
    res.json(data.getPosts());
});

router.get('/posts/:id', (req, res) => {
    const id = req.params.id;
    const post = data.getPost(id);
    if (post) {
        res.json(post);
    } else {
        res.status(404).json({ message: 'Post not found' });
    }
});

router.post('/posts', (req, res) => {
    const newPost = req.body;
    const createdPost = data.createPost(newPost);
    res.json(createdPost);
});

router.post('/posts/:id/like', (req, res) => {
    const id = req.params.id;
    const liked = data.likePost(id);
    res.json({ liked });
});

router.get('/comments', (req, res) => {
    res.json(data.getComments());
});

router.post('/comments', (req, res) => {
    const newComment = req.body;
    const createdComment = data.createComment(newComment);
    res.json(createdComment);
});

module.exports = router;