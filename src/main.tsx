import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { sanitizeLocalStorage } from './utils/jarvesStorage';

// Sanitize any corrupt local storage values immediately
sanitizeLocalStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
