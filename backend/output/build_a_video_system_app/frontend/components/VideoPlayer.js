import React from 'react';
import './VideoPlayer.css'; // Basic styles for the video player

function VideoPlayer({ video }) {
  // If no video object is provided, display a placeholder message
  if (!video) {
    return (
      <div className="video-player-container">
        <p>Select a video to play.</p>
      </div>
    );
  }

  // Construct the URL for the video file.
  // The '/videos' prefix maps to the static files served by the Express server.
  const videoUrl = `/videos/${video.filename}`;

  return (
    <div className="video-player-container">
      <h3>{video.title}</h3>
      {/* The key prop ensures that the video element is re-mounted when the video ID changes,
          which can help in resetting the player state (e.g., current time, paused state). */}
      <video controls width="100%" height="auto" key={video.id}>
        <source src={videoUrl} type="video/mp4" />
        {/* Fallback message for browsers that do not support the video tag */}
        Your browser does not support the video tag.
      </video>
      <p>Uploaded: {new Date(video.uploadDate).toLocaleDateString()}</p>
    </div>
  );
}

export default VideoPlayer;