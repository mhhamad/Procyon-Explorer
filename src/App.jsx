import React, { useState, useCallback, useRef, useEffect } from 'react';
import ImageSelector from './components/ImageSelector';
import ImageViewer from './components/ImageViewer';
import AIChatBot from './components/AIChatBot';
import ImageUploader from './components/ImageUploader';
import AnnotationSearchBar from './components/AnnotationSearchBar';
import './App.css';

// Server URL - works in both dev and production
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5174';

const IMAGES_INITIAL = [
  {
    id: 'hubble-panoramic-1',
    name: "Hubble's Panoramic",
    description: "Hubble's panoramic view of the Andromeda Galaxy",
    dziPath: './tiles/test1/image.dzi'
  },
  {
    id: 'hubble-panoramic-2',
    name: "Hubble's Panoramic",
    description: "Hubble's panoramic view of the Andromeda Galaxy",
    dziPath: './tiles/test2/image.dzi'
  }
];

function loadAllAnnotations(images) {
  let all = [];
  images.forEach(img => {
    try {
      const key = `annotations:${img.id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(a => all.push({ ...a, imageId: img.id }));
        } else if (parsed && Array.isArray(parsed.annotations)) {
          parsed.annotations.forEach(a => all.push({ ...a, imageId: img.id }));
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  });
  return all;
}

function App() {
  const [images, setImages] = useState(IMAGES_INITIAL);
  const [selectedImage, setSelectedImage] = useState(IMAGES_INITIAL[0]);
  const [focusAnnotation, setFocusAnnotation] = useState(null);
  const osdViewerRef = useRef(null);

  // allAnnotations state
  const [allAnnotations, setAllAnnotations] = useState(() => loadAllAnnotations(IMAGES_INITIAL));

  // Load previously uploaded images on mount
  useEffect(() => {
    async function loadUploadedImages() {
      try {
        const response = await fetch(`${SERVER_URL}/images/uploaded`);
        const uploadedMetadata = await response.json();
        
        if (uploadedMetadata.length > 0) {
          const uploadedImages = uploadedMetadata.map(meta => ({
            id: `${meta.dziBaseName}-${meta.uploadId}`,
            name: meta.dziBaseName,
            description: `Uploaded: ${meta.originalFilename}`,
            dziPath: meta.dziPath
          }));
          
          setImages(prev => [...prev, ...uploadedImages]);
          console.log(`✅ Loaded ${uploadedImages.length} previously uploaded images`);
        }
      } catch (err) {
        console.error('Failed to load uploaded images:', err);
      }
    }
    
    loadUploadedImages();
  }, []);

  function reloadAnnotations(imgs) {
    setAllAnnotations(loadAllAnnotations(imgs));
  }

  function handleUploadComplete(result) {
    const newImage = {
      id: `${result.dziBaseName}-${Date.now()}`,
      name: result.dziBaseName,
      description: "Your uploaded image",
      dziPath: result.dziPath // Full URL from server
    };
    console.log("✅ New image added:", newImage);
    const newImages = [...images, newImage];
    setImages(newImages);
    setSelectedImage(newImage);
    reloadAnnotations(newImages);
  }

  function handleAnnotationResultClick(annotation) {
    if (!annotation || !annotation.imageId) return;
    const img = images.find((img) => img.id === annotation.imageId);
    if (img) {
      if (selectedImage.id !== img.id) {
        setFocusAnnotation(null);
        setSelectedImage(img);
        const interval = setInterval(() => {
          console.log("Waiting for viewer to be ready...");
          if (osdViewerRef.current && osdViewerRef.current.isOpen()) {
            clearInterval(interval);
            setFocusAnnotation(annotation);
          }
        }, 200);
      } else {
        setFocusAnnotation(annotation);
      }
    }
  }

  useEffect(() => {
    reloadAnnotations(images);
  }, [images]);

  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key && e.key.startsWith('annotations:')) {
        reloadAnnotations(images);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [images]);

  // Stable, robust updater
  const handleAnnotationsUpdated = useCallback((imageId, annotationsForImage) => {
    setAllAnnotations(prev => {
      // keep other images' annotations
      const others = prev.filter(a => a.imageId !== imageId);

      // map new ones for this image
      const mapped = (annotationsForImage || []).map(a => ({ ...a, imageId }));

      // quick equality check to avoid needless state updates:
      const prevThis = prev.filter(a => a.imageId === imageId);
      if (prevThis.length === mapped.length) {
        const prevMap = new Map(prevThis.map(a => [a.id, a]));
        let identical = true;
        for (let m of mapped) {
          const p = prevMap.get(m.id);
          if (!p || p.updatedAt !== m.updatedAt) {
            identical = false;
            break;
          }
        }
        if (identical) {
          return prev;
        }
      }

      return [...others, ...mapped];
    });
  }, []);

  return (
    <div className="app">
      <AIChatBot selectedImage={selectedImage} annotations={allAnnotations} />
      <header className="app-header">
        <div className="header-content">
          <h1>Procyon Explorer</h1>
          <h3><em>Explore the unseen. Make the universe accessible</em></h3>
        </div>
      </header>
      <div className='search'>
        <AnnotationSearchBar
          annotations={allAnnotations}
          onResultClick={handleAnnotationResultClick}
        />
      </div>
      <div className="main-content">
        <div>
          <ImageSelector
            images={images}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
          />
          <ImageUploader onUploadComplete={handleUploadComplete} />
        </div>

        <div className="viewer-container">
          {selectedImage && selectedImage.dziPath ? (
            <ImageViewer
              image={selectedImage}
              key={selectedImage.id}
              focusAnnotation={focusAnnotation}
              setFocusAnnotation={setFocusAnnotation}
              onAnnotationsUpdated={handleAnnotationsUpdated}
              osdViewerRef={osdViewerRef}
            />
          ) : (
            <div style={{ padding: '2rem', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <h2>No image selected or image data is invalid.</h2>
            </div>
          )}
        </div>
      </div>
      <footer className="app-footer">
        <p>NASA Space Apps Challenge Demo • Built with React & OpenSeadragon</p>
      </footer>
    </div>
  );
}

export default App;