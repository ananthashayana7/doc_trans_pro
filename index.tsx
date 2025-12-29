import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("🚀 Neural Engine starting up...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Critical: Root element not found in HTML.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    console.log("✅ App mounted successfully.");
  } catch (err) {
    console.error("❌ Render error:", err);
  }
}
