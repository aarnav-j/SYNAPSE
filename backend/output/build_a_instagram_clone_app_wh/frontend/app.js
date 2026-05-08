This file manages posts, comments, likes, and edits on the frontend.
</EXPLANATION>

const postForm = document.getElementById('post-form');
const commentForm = document.getElementById('comment-form');
const likeButton = document.getElementById('like-button');

const getPosts = async () => {
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        const postsElement = document.getElementById('posts');
        postsElement.innerHTML = '';
        data.forEach((post) => {
            const postElement = document.createElement('div');
            postElement.textContent = `${post.title} - ${post.content}`;
            postsElement.appendChild(postElement);
        });
    } catch (error) {
        console.error(error);
    }
};

const getPost = async (id) => {
    try {
        const response = await fetch(`/api/posts/${id}`);
        const data = await response.json();
        const postElement = document.getElementById('post');
        postElement.textContent = `${data.title} - ${data.content}`;
    } catch (error) {
        console.error(error);
    }
};

const createPost = async (newPost) => {
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost),
        });
        const data = await response.json();
        const postsElement = document.getElementById('posts');
        const postElement = document.createElement('div');
        postElement.textContent = `${data.title} - ${data.content}`;
        postsElement.appendChild(postElement);
    } catch (error) {
        console.error(error);
    }
};

const likePost = async (id) => {
    try {
        const response = await fetch(`/api/posts/${id}/like`, {
            method: 'POST',
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error(error);
    }
};

const getComments = async () => {
    try {
        const response = await fetch('/api/comments');
        const data = await response.json();
        const commentsElement = document.getElementById('comments');
        commentsElement.innerHTML = '';
        data.forEach((comment) => {
            const commentElement = document.createElement('div');
            commentElement.textContent = `${comment.content}`;
            commentsElement.appendChild(commentElement);
        });
    } catch (error) {
        console.error(error);
    }
};

const createComment = async (newComment) => {
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newComment),
        });
        const data = await response.json();
        const commentsElement = document.getElementById('comments');
        const commentElement = document.createElement('div');
        commentElement.textContent = `${data.content}`;
        commentsElement.appendChild(commentElement);
    } catch (error) {
        console.error(error);
    }
};

postForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newPost = {
        title: document.getElementById('title').value,
        content: document.getElementById('content').value,
    };
    createPost(newPost);
});

commentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newComment = {
        postId: 1,
        content: document.getElementById('comment').value,
    };
    createComment(newComment);
});

likeButton.addEventListener('click', () => {
    likePost(1);
});

getPosts();
getComments();