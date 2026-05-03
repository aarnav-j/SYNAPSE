const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the directory where uploaded videos will be stored
const UPLOAD_DIR = path.join(__dirname, '../public/videos');

// Ensure the upload directory exists. If not, create it recursively.
if (!fs.existsSync(UPLOAD_DIR)) {
  console.log(`Creating upload directory: ${UPLOAD_DIR}`);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage for uploaded files using multer's diskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination directory for uploaded files
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Append the original file extension to the unique filename
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer with storage, file size limits, and a file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100 MB (100 * 1024 * 1024 bytes)
  fileFilter: (req, file, cb) => {
    // Define allowed video file types using a regular expression
    const filetypes = /mp4|mov|avi|wmv|flv|webm|mkv/; // Added mkv for broader compatibility
    const mimetype = filetypes.test(file.mimetype); // Check file's MIME type
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase()); // Check file's extension

    if (mimetype && extname) {
      // If both MIME type and extension are allowed, accept the file
      return cb(null, true);
    }
    // Otherwise, reject the file with an error message
    cb(new Error('Only video files (mp4, mov, avi, wmv, flv, webm, mkv) are allowed!'));
  }
});

module.exports = upload;