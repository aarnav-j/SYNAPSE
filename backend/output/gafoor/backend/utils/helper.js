const helper = {
  validateVideo: (video) => {
    if (!video.title) {
      throw new Error('Title is required');
    }
    return video;
  },
};

module.exports = helper;