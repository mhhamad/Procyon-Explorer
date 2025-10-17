import React, { useState } from "react";

const MAX_SIZE = 512 * 1024 * 1024; // 0.5GB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["image/jpeg", "image/png", "image/tiff", "image/bmp"];

// Server URL - works in both dev and production
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5174';

export default function ImageUploader({ onUploadComplete }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = React.useRef();

  async function handleFile(e) {
    setError("");
    setProgress(0);
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > MAX_SIZE) {
      setError("File too large (max 0.5GB)");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError("Unsupported file type");
      return;
    }

    setUploading(true);

    try {
      // 1. Init upload
      let res = await fetch(`${SERVER_URL}/upload/init`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to initialize upload");
      let { uploadId } = await res.json();

      // 2. Upload chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const form = new FormData();
        form.append("chunk", chunk);
        form.append("uploadId", uploadId);
        form.append("chunkIndex", i);
        
        try {
          await fetch(`${SERVER_URL}/upload/chunk`, {
            method: "POST",
            body: form,
          });
          
          // Update progress
          setProgress(Math.round(((i + 1) / totalChunks) * 90)); // 0-90% for upload
        } catch (err) {
          throw new Error(`Upload failed at chunk ${i}: ${err.message}`);
        }
      }

      // 3. Complete upload
      setProgress(95); // Processing
      res = await fetch(`${SERVER_URL}/upload/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          totalChunks,
          filename: file.name,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload completion failed");
      }
      
      const result = await res.json();
      console.log("✅ Upload complete", result);
      
      if (!result.success) {
        throw new Error(result.error || "Unknown error");
      }
      
      setProgress(100);
      setUploading(false);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear progress after a delay
      setTimeout(() => setProgress(0), 2000);
      
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  }

  function handleButtonClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  return (
    <div style={{ marginTop: '1em', textAlign: 'center' }}>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.tif,.tiff,.bmp"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFile}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={uploading}
        aria-label="Add image"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: uploading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.7em',
          margin: '0.5em auto',
          transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!uploading) e.currentTarget.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'; }}
        onMouseOut={e => { if (!uploading) e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; }}
      >
        <span style={{ pointerEvents: 'none', fontWeight: 700, fontFamily: 'inherit' }}>
          {uploading ? '⏳' : '+'}
        </span>
      </button>
      
      {uploading && progress > 0 && (
        <div style={{ marginTop: '0.5em', fontSize: '0.9em', color: '#667eea' }}>
          {progress < 95 ? `Uploading: ${progress}%` : 'Processing...'}
        </div>
      )}
      
      {uploading && (
        <div style={{ 
          width: '80%', 
          height: '4px', 
          background: '#e0e0e0', 
          borderRadius: '2px',
          margin: '0.5em auto',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
      
      {error && <div style={{ color: "red", marginTop: '0.5em', fontSize: '0.9em' }}>{error}</div>}
    </div>
  );
}