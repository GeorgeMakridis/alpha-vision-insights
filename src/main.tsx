import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: Starting to load...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('main.tsx: Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; color: white; background: #1a1f2c; font-family: monospace;">
      <h2>Critical Error</h2>
      <p>Root element not found. The page structure may be incorrect.</p>
    </div>
  `;
} else {
  try {
    console.log('main.tsx: Creating React root...');
    const root = createRoot(rootElement);
    console.log('main.tsx: React root created');
    
    console.log('main.tsx: Rendering App...');
    root.render(<App />);
    console.log('main.tsx: React app mounted successfully');
  } catch (error) {
    console.error('main.tsx: Error mounting React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #1a1f2c; font-family: monospace;">
        <h2>Error Loading Application</h2>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style="margin-top: 20px; padding: 10px; background: #2a2f3c; overflow: auto; white-space: pre-wrap;">
          ${error instanceof Error ? error.stack : String(error)}
        </pre>
        <p style="margin-top: 20px; color: #888;">Check browser console (F12) for more details.</p>
      </div>
    `;
  }
}
