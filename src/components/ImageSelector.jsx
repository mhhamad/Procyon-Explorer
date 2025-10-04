// src/components/ImageSelector.jsx
import { Image, Info } from 'lucide-react';
import './ImageSelector.css';

function ImageSelector({ images, selectedImage, onSelectImage }) {
  return (
    <div className="image-selector">
      <h3 className="selector-title">
        <Image size={20} />
        Select Image
      </h3>
      
      <div className="image-list">
        {images.map((image) => (
          <button
            key={image.id}
            className={`image-card ${selectedImage.id === image.id ? 'selected' : ''}`}
            onClick={() => onSelectImage(image)}
          >
            <div className="image-card-content">
              <div className="image-info">
                <h4>{image.name}</h4>
                <p>{image.description}</p>
              </div>
            </div>
            
            {selectedImage.id === image.id && (
              <div className="selected-indicator">   
                Active
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ImageSelector;