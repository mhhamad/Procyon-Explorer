// src/components/ImageUploader.jsx
import React, { useState } from "react";

const MAX_SIZE = 512 * 1024 * 1024; // 0.5GB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["image/jpeg", "image/png", "image/tiff", "image/bmp"];

export default function ImageUploader({ onUploadComplete }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef();

  async function handleFile(e) {
    setError("");
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

    // 1. Init upload
    let res = await fetch("http://localhost:5174/upload/init", { method: "POST" });
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
        await fetch("http://localhost:5174/upload/chunk", {
          method: "POST",
          body: form,
        });
      } catch {
        setError("Upload failed at chunk " + i);
        setUploading(false);
        return;
      }
    }

    // 3. Complete upload
    try {
      res = await fetch("http://localhost:5174/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          totalChunks,
          filename: file.name,
        }),
      });
      const result = await res.json();
      console.log("Upload complete", result);
      if (!result.success) throw new Error(result.error || "Unknown error");
      setUploading(false);
      if (onUploadComplete) onUploadComplete(result);
    } catch (err) {
      setError("DZI generation failed: " + err.message);
      setUploading(false);
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
        <span style={{ pointerEvents: 'none', fontWeight: 700, fontFamily: 'inherit' }}>+</span>
      </button>
      {error && <div style={{ color: "red", marginTop: '0.5em' }}>{error}</div>}
    </div>
  );
}
