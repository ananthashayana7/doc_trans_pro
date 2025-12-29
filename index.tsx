import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("App booting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  console.log("App rendered successfully");
} catch (err) {
  console.error("Render error:", err);
}
