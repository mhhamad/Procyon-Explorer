// src/App.jsx
import React, { useState, useCallback, useRef } from 'react';
import ImageSelector from './components/ImageSelector';
import ImageViewer from './components/ImageViewer';
import AIChatBot from './components/AIChatBot';
import ImageUploader from './components/ImageUploader';
import AnnotationSearchBar from './components/AnnotationSearchBar';
import './App.css';

const IMAGES_INITIAL = [
  {
    id: 'Hubble’s panoramic',
    name: 'Hubble’s panoramic',
    description: 'Hubble’s panoramic view of the Andromeda Galaxy',
    dziPath: './tiles/test1/dzifile.dzi'
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

  function reloadAnnotations(imgs) {
    setAllAnnotations(loadAllAnnotations(imgs));
  }

  function handleUploadComplete(result) {
    const newImage = {
      id: `${result.dziBaseName}-${Date.now()}`,
      name: result.dziBaseName,
      description: "your image",
      dziPath: result.dziPath
    };
    console.log("New image added:", newImage);
    const newImages = [...images, newImage];
    setImages((prev) => [...prev, newImage]);
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
          if (osdViewerRef.current.isOpen()) {
            clearInterval(interval);
            setFocusAnnotation(annotation);
          }
        }, 200);
      } else {
        setFocusAnnotation(annotation);
      }
    }
  }

  React.useEffect(() => {
    reloadAnnotations(images);
  }, [images]);

  React.useEffect(() => {
    function handleStorageChange(e) {
      if (e.key && e.key.startsWith('annotations:')) {
        reloadAnnotations(images);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [images]);

  // ---------- New: stable, robust updater ----------
  const handleAnnotationsUpdated = useCallback((imageId, annotationsForImage) => {
    setAllAnnotations(prev => {
      // keep other images' annotations
      const others = prev.filter(a => a.imageId !== imageId);

      // map new ones for this image
      const mapped = (annotationsForImage || []).map(a => ({ ...a, imageId }));

      // quick equality check to avoid needless state updates:
      // build map of previous entries for this image by id
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
          // No change — return previous state object to avoid rerender churn
          return prev;
        }
      }

      // otherwise produce a new consolidated array
      return [...others, ...mapped];
    });
  }, []); // stable identity

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
    </div >
  );
}

export default App;