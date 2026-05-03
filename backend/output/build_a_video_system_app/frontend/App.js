import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './components/VideoPlayer';
import UploadForm from './components/UploadForm';
import './App.css'; // Basic App-specific styles

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // useCallback to memoize the fetchVideos function, preventing unnecessary re-renders
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch('/api/videos');
      if (!response.ok) {
        // Throw an error for HTTP status codes outside the 200-299 range
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setVideos(data);
      // If no video is selected and there are videos available, select the first one
      if (data.length > 0 && !selectedVideo) {
        setSelectedVideo(data[0]);
      } else if (data.length === 0) {
        // If no videos are available, ensure no video is selected
        setSelectedVideo(null);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setError("Failed to load videos. Please try again later.");
      setVideos([]); // Clear videos on error
      setSelectedVideo(null); // Clear selected video on error
    } finally {
      setLoading(false);
    }
  }, [selectedVideo]); // Dependency on selectedVideo to re-evaluate if it changes externally

  // useEffect to fetch videos when the component mounts or fetchVideos changes
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]); // Dependency array includes fetchVideos

  // Handler for selecting a video from the list
  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  // Handler for successful video upload, triggers a re-fetch of the video list
  const handleUploadSuccess = () => {
    fetchVideos();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Streaming App</h1>
      </header>
      <main className="App-main">
        <div className="video-player-section">
          {selectedVideo ? (
            <VideoPlayer video={selectedVideo} />
          ) : (
            <p className="player-message">
              {loading ? "Loading video..." : error || "No video selected or available."}
            </p>
          )}
        </div>
        <div className="sidebar">
          <div className="video-list-section">
            <h2>Available Videos</h2>
            {loading && <p>Loading videos...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && videos.length === 0 && <p>No videos uploaded yet.</p>}
            <ul className="video-list">
              {videos.map((video) => (
                <li
                  key={video.id}
                  className={selectedVideo && selectedVideo.id === video.id ? 'selected' : ''}
                  onClick={() => handleVideoSelect(video)}
                >
                  {video.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="upload-form-section">
            <h2>Upload New Video</h2>
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;