import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Patch ResizeObserver to suppress harmless "loop completed" error from Monaco Editor
// This error is cosmetic and has zero impact on functionality.
// React dev overlay catches it before window error handlers, so we must patch at the source.
const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
  constructor(callback) {
    super((entries, observer) => {
      // Wrap callback in requestAnimationFrame to prevent the loop notification
      requestAnimationFrame(() => {
        try {
          callback(entries, observer);
        } catch (e) {
          // Silently ignore ResizeObserver callback errors
        }
      });
    });
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
