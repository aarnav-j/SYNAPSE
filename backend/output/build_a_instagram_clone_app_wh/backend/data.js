This file stores in-memory data for posts and comments.
</EXPLANATION>

const posts = [
    { id: 1, title: 'Post 1', content: 'This is post 1' },
    { id: 2, title: 'Post 2', content: 'This is post 2' },
];

const comments = [
    { id: 1, postId: 1, content: 'Comment 1' },
    { id: 2, postId: 1, content: 'Comment 2' },
];

const getPosts = () => {
    return posts;
};

const getPost = (id) => {
    return posts.find((post) => post.id === id);
};

const createPost = (newPost) => {
    const newId = posts.length + 1;
    const newPostData = { id: newId, title: newPost.title, content: newPost.content };
    posts.push(newPostData);
    return newPostData;
};

const likePost = (id) => {
    const post = getPost(id);
    if (post) {
        post.liked = true;
        return true;
    } else {
        return false;
    }
};

const getComments = () => {
    return comments;
};

const createComment = (newComment) => {
    const newId = comments.length + 1;
    const newCommentData = { id: newId, postId: newComment.postId, content: newComment.content };
    comments.push(newCommentData);
    return newCommentData;
};

module.exports = {
    getPosts,
    getPost,
    createPost,
    likePost,
    getComments,
    createComment,
};