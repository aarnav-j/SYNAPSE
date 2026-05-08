const videoList = document.getElementById('video-list');

document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/videos')
    .then(response => response.json())
    .then(videos => {
      videos.forEach(video => {
        const videoElement = document.createElement('li');
        videoElement.textContent = video.title;
        videoList.appendChild(videoElement);
      });
    })
    .catch(error => console.error(error));
});

document.getElementById('add-video-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.getElementById('title').value;
  const video = { title };
  fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(video),
  })
    .then(response => response.json())
    .then((video) => {
      const videoElement = document.createElement('li');
      videoElement.textContent = video.title;
      videoList.appendChild(videoElement);
    })
    .catch(error => console.error(error));
});