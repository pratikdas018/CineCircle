import React, { useState, useEffect } from 'react';

// Inject keyframes for spinner animation into the document head.
// This is a clean way to handle CSS animations in a component
// without needing a separate CSS file or a CSS-in-JS library.
const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = keyframes;
document.head.appendChild(styleSheet);

const TrailerModal = ({ isOpen, onClose, trailerKey }) => {
  const [isLoading, setIsLoading] = useState(true);

  // When the modal opens or the trailer changes, reset the loading state.
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, trailerKey]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          &times; Close Trailer
        </button>
        {trailerKey ? (
          <div style={styles.iframeContainer}>
            {isLoading && (
              <div style={styles.spinnerContainer}>
                <div style={styles.spinner}></div>
              </div>
            )}
            <iframe
              style={{ ...styles.iframe, visibility: isLoading ? 'hidden' : 'visible' }}
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ) : (
          <div style={styles.noVideo}>Trailer not available</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    position: 'relative',
    width: 'min(96vw, 1000px)',
    maxWidth: '1000px',
    maxHeight: '85vh',
    aspectRatio: '16/9',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.55)',
    padding: '6px 10px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    zIndex: 3,
  },
  noVideo: {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '1.5rem',
  },
  iframeContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  spinnerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  spinner: {
    border: '5px solid rgba(255, 255, 255, 0.2)',
    borderTop: '5px solid #fff',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
  },
  iframe: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
};

export default TrailerModal;
