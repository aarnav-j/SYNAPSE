import React, { useState } from 'react';
import './UploadForm.css'; // Basic styles for the upload form

function UploadForm({ onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Handles file selection from the input field
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Handles form submission for video upload
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    setMessage(''); // Clear previous messages
    setIsError(false); // Reset error state

    // Basic client-side validation
    if (!title.trim() || !selectedFile) {
      setMessage('Please provide both a title and select a video file.');
      setIsError(true);
      return;
    }

    setUploading(true); // Set uploading state to true
    const formData = new FormData(); // Create FormData object for file upload
    formData.append('title', title.trim()); // Append video title
    formData.append('video', selectedFile); // Append the selected video file

    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData, // FormData automatically sets the Content-Type header to multipart/form-data
      });

      if (!response.ok) {
        // Attempt to parse error message from the server response
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMessage(`Video "${result.title}" uploaded successfully!`);
      setIsError(false);
      setTitle(''); // Clear title input
      setSelectedFile(null); // Clear selected file
      // Reset file input value to allow re-uploading the same file if needed
      document.getElementById('videoFile').value = '';

      if (onUploadSuccess) {
        onUploadSuccess(); // Notify parent component (App.js) to refresh video list
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setMessage(`Upload failed: ${error.message}`);
      setIsError(true);
    } finally {
      setUploading(false); // Reset uploading state
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">Video Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={uploading} // Disable input during upload
          aria-label="Video Title"
        />
      </div>
      <div className="form-group">
        <label htmlFor="videoFile">Select Video:</label>
        <input
          type="file"
          id="videoFile"
          accept="video/*" // Suggests video files to the user
          onChange={handleFileChange}
          required
          disabled={uploading} // Disable input during upload
          aria-label="Select Video File"
        />
      </div>
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
      {message && (
        <p className={`upload-message ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </form>
  );
}

export default UploadForm;