import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({ immediate: true });
} catch {
  // Ignore if SW registration is blocked in restricted preview contexts
}

createRoot(document.getElementById('root')!).render(<App />);
