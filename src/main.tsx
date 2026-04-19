import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../assets/App';
import '../index.css';

// Suppress recharts defaultProps warning
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalError(...args);
};

console.log('Index.tsx is executing...');
const rootElement = document.getElementById('root');
console.log('rootElement:', rootElement);
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);