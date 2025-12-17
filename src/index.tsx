import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // This must point to your Tailwind CSS file
import App from './App';

/**
 * ENTRY POINT
 * This file mounts the React application to the HTML 'root' element.
 * It uses StrictMode to help identify potential problems during development.
 */

const rootElement = document.getElementById('root');

if (!rootElement) {
  // This error helps you debug if your index.html is missing the <div id="root"></div>
  throw new Error("Target container 'root' is missing. Please check your index.html file.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);