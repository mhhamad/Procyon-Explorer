// src/components/ImageViewer.jsx
import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import { ZoomIn, ZoomOut, Home, Maximize, Loader } from 'lucide-react';
import { createPortal } from 'react-dom';
import Labeling from './Labeling';
import './ImageViewer.css';

function ImageViewer({ image, focusAnnotation, setFocusAnnotation, onAnnotationsUpdated ,osdViewerRef}) {
  const viewerRef = useRef(null);
  
  const [osdReady, setOsdReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // labeling feature
  const labelRefs = useRef([]);
  const [annotations, setAnnotations] = useState([]);
  const saveTimerRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'

  const maxZoomLevel = 150; // Define max zoom level
  const minZoomLevel = 0.5; // Define min zoom level


  useEffect(() => {
    setOsdReady(false);

    if (viewerRef.current && !osdViewerRef.current) {
      osdViewerRef.current = OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
        tileSources: image.dziPath,
        showNavigationControl: false,
        minZoomLevel: minZoomLevel,
        maxZoomLevel: maxZoomLevel,
        visibilityRatio: 1.0,
        constrainDuringPan: true,
        defaultZoomLevel: 1,
        homeFillsViewer: true,
        gestureSettingsMouse: {
          scrollToZoom: true,
          clickToZoom: false,
          dblClickToZoom: false,
          pinchToZoom: true
        },
        gestureSettingsTouch: {
          scrollToZoom: false,
          clickToZoom: false,
          dblClickToZoom: false,
          pinchToZoom: true,
          flickEnabled: true
        }
      });

      const onOpen = () => {
        setIsLoading(false);
        setError(null);
        setOsdReady(true);
      };

      const onOpenFailed = () => {
        setIsLoading(false);
        setError('Failed to load image. Please check if DZI tiles are generated.');
      };

      const onTileFailed = (event) => {
        console.warn('Tile load failed:', event.tile);
      };

      osdViewerRef.current.addHandler('open', onOpen);
      osdViewerRef.current.addHandler('open-failed', onOpenFailed);
      osdViewerRef.current.addHandler('tile-load-failed', onTileFailed);

      // cleanup handlers on unmount/replace
      return () => {
        try {
          osdViewerRef.current.removeHandler('open', onOpen);
          osdViewerRef.current.removeHandler('open-failed', onOpenFailed);
          osdViewerRef.current.removeHandler('tile-load-failed', onTileFailed);
        } catch (e) { /* ignore if already removed */ }

        try {
          osdViewerRef.current.destroy();
        } catch (e) { /* ignore errors */ }
        osdViewerRef.current = null;
        setOsdReady(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.dziPath]);

  // --- Focus annotation when prop changes ---
  useEffect(() => {
    if (!focusAnnotation || !osdViewerRef.current || !osdViewerRef.current.viewport) return;

    const viewer = osdViewerRef.current;
    const tiledImage = viewer.world.getItemAt(0);
    if (!tiledImage) return;

    const { x, y } = focusAnnotation; // <-- use x/y directly
    if (typeof x !== 'number' || typeof y !== 'number') return;

    try {
      // Convert image coordinates to viewport coordinates
      const point = tiledImage.imageToViewportCoordinates(x, y);

      // Pan to the point
      viewer.viewport.panTo(point, true);

      // Optional: zoom in (max 2x or current max zoom)
      viewer.viewport.zoomTo(
        Math.min(viewer.viewport.getMaxZoom(), 5),
        point,
        true
      );

    } catch (e) {
      console.error('Error panning or zooming:', e);
    }

    setFocusAnnotation(null)
  }, [focusAnnotation]);
  // Removed osdViewerRef from dependencies

  // --- Persistence: storage key helper ---
  const storageKeyForImage = (id) => `annotations:${id}`;

  // --- Load annotations on image change ---
  useEffect(() => {
    // reset states
    setIsLoading(true);
    setError(null);
    setAnnotations([]);
    setSaveStatus('saved');

    try {
      const key = storageKeyForImage(image.id);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setAnnotations(parsed);
        } else if (parsed && Array.isArray(parsed.annotations)) {
          setAnnotations(parsed.annotations);
        } else {
          console.warn('Annotations JSON invalid structure, resetting to empty.', parsed);
          setAnnotations([]);
        }
      } else {
        setAnnotations([]);
      }
    } catch (err) {
      console.warn('Failed to read annotations from localStorage', err);
      setAnnotations([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image.id]);

  // --- Call parent callback immediately when annotations change ---
  useEffect(() => {
    if (!image?.id) return;
    if (typeof onAnnotationsUpdated === 'function') {
      try {
        // pass image id so parent knows which image changed
        onAnnotationsUpdated(image.id, annotations);
      } catch (err) {
        // don't break UI if parent throws
        console.warn('onAnnotationsUpdated handler threw', err);
      }
    }
  }, [annotations, image?.id, onAnnotationsUpdated]);

  // --- Debounced save when annotations change ---
  useEffect(() => {
    if (!image?.id) return;

    setSaveStatus('saving');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      try {
        const key = storageKeyForImage(image.id);
        const payload = {
          imageId: image.id,
          version: 1,
          updatedAt: Date.now(),
          annotations
        };
        localStorage.setItem(key, JSON.stringify(payload));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save annotations to localStorage', err);
        setSaveStatus('error');
      }
      saveTimerRef.current = null;
    }, 500); // debounce 500ms

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [annotations, image.id]);

  // UI actions ...
  const handleZoomIn = () => {
    if (osdViewerRef.current) {
      osdViewerRef.current.viewport.zoomBy(1.5);
      osdViewerRef.current.viewport.applyConstraints();
    }
  };

  const handleZoomOut = () => {
    if (osdViewerRef.current) {
      osdViewerRef.current.viewport.zoomBy(0.7);
      osdViewerRef.current.viewport.applyConstraints();
    }
  };

  const handleHome = () => {
    if (osdViewerRef.current) {
      osdViewerRef.current.viewport.goHome();
    }
  };

  const handleFullscreen = () => {
    if (osdViewerRef.current) {
      osdViewerRef.current.setFullScreen(!osdViewerRef.current.isFullPage());
    }
  };

  return (
    <div className="image-viewer">
      <div className="viewer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{image.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="save-status" title="Annotations save status">
            {saveStatus === 'saving' && <span>Saving…</span>}
            {saveStatus === 'saved' && <span>Saved</span>}
            {saveStatus === 'error' && <span style={{ color: '#ff6b6b' }}>Error saving</span>}
          </div>
        </div>
      </div>

      <div className="viewer-wrapper">
        {isLoading && (
          <div className="loading-overlay">
            <Loader className="spinner" size={48} />
            <p>Loading high-resolution image...</p>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <p className="error-message">{error}</p>
            <p className="error-hint">
              Make sure to generate DZI tiles using:<br />
              <code>vips dzsave input.tiff public/tiles/{image.id}/image</code>
            </p>
          </div>
        )}

        <div
          ref={viewerRef}
          className="openseadragon-viewer"
          style={{
            width: '100%',
            height: '600px',
            background: '#000'
          }}
        />

        {osdReady && (
          createPortal(
            <Labeling
              osdRef={osdViewerRef}
              labelRefs={labelRefs}
              annotations={annotations}
              setAnnotations={setAnnotations}
            />
            , document.body))}

        <div className="viewer-controls">
          <button
            onClick={handleZoomIn}
            className="control-btn"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="control-btn"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={handleHome}
            className="control-btn"
            title="Reset View"
          >
            <Home size={20} />
          </button>
          <button
            onClick={handleFullscreen}
            className="control-btn"
            title="Fullscreen"
          >
            <Maximize size={20} />
          </button>
        </div>
        <div className="viewer-tips">
          <p>💡 <strong>Tips:</strong> Use scroll to zoom • Click and drag to pan • Double-click to add a label</p>
        </div>
      </div>
    </div>
  );
}

export default ImageViewer;