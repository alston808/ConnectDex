import { uploadMedia } from './db.js';

// Element references
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const uploadProgress = document.getElementById('upload-progress');
const uploadStatus = document.getElementById('upload-status');

// Setup event listeners
document.addEventListener('DOMContentLoaded', function() {
  if (uploadForm) {
    setupUploadForm();
  }
});

function setupUploadForm() {
  // Preview selected file
  if (fileInput) {
    fileInput.addEventListener('change', previewFile);
  }
  
  // Handle form submission
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUpload);
  }
}

// Preview the selected file
function previewFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Reset status
  if (uploadStatus) {
    uploadStatus.textContent = '';
  }
  
  // Show preview
  if (uploadPreview) {
    uploadPreview.innerHTML = '';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = '100%';
      img.style.maxHeight = '200px';
      uploadPreview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '200px';
      uploadPreview.appendChild(video);
    } else {
      uploadPreview.textContent = `Selected file: ${file.name} (${formatSize(file.size)})`;
    }
  }
}

// Handle file upload
async function handleUpload(e) {
  e.preventDefault();
  
  const file = fileInput.files[0];
  if (!file) {
    showStatus('Please select a file to upload', 'error');
    return;
  }
  
  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showStatus(`File too large. Maximum size is ${formatSize(maxSize)}`, 'error');
    return;
  }
  
  try {
    // Show progress
    showStatus('Uploading...', 'info');
    
    // Upload file
    const publicUrl = await uploadMedia(file);
    
    // Show success message
    showStatus('File uploaded successfully!', 'success');
    
    // Provide URL to user
    const urlDisplay = document.createElement('div');
    urlDisplay.className = 'upload-url';
    urlDisplay.innerHTML = `
      <p>File URL:</p>
      <input type="text" value="${publicUrl}" readonly onclick="this.select()">
      <button type="button" class="button" onclick="navigator.clipboard.writeText('${publicUrl}').then(() => alert('URL copied!'))">
        Copy
      </button>
    `;
    uploadStatus.appendChild(urlDisplay);
    
    // Reset form
    fileInput.value = '';
    
  } catch (error) {
    console.error('Upload error:', error);
    showStatus(`Upload failed: ${error.message}`, 'error');
  }
}

// Helper to show status message
function showStatus(message, type = 'info') {
  if (!uploadStatus) return;
  
  uploadStatus.textContent = message;
  uploadStatus.className = `upload-status ${type}`;
}

// Helper to format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}