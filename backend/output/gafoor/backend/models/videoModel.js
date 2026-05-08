class VideoModel {
  constructor() {
    this.videos = [];
  }

  getVideos() {
    return this.videos;
  }

  addVideo(video) {
    this.videos.push(video);
  }
}

const videoModel = new VideoModel();
module.exports = videoModel;